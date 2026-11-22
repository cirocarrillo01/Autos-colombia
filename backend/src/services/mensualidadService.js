// backend/src/services/mensualidadService.js
// Lógica de negocio de mensualidades y confirmación de pagos (RF05/RF06).
// La app NO cobra: solo confirma que el pago (hecho por fuera) se realizó.
import { conTransaccion } from "../config/db.js";
import { ErrorNegocio } from "../utils/errores.js";
import { validarPlaca } from "../validators/placa.js";
import { SQL_HOY_BOGOTA } from "../utils/fechas.js";
import {
  CUPOS_POR_TIPO,
  DIAS_ANTICIPACION_MAX,
  SQL_ULTIMA_MENSUALIDAD,
  planificarPeriodo,
  hoyBogota,
  aYMD,
} from "../utils/mensualidad.js";

/**
 * Vehículos distintos con mensualidad que cubre hoy o futura, por tipo.
 * `db` puede ser el pool o una conexión (ambos tienen .query -> [rows]).
 */
export async function contarOcupados(db, idTipoVehiculo) {
  const [rows] = await db.query(
    `SELECT COUNT(DISTINCT m.id_vehiculo) AS total
     FROM mensualidades m
     INNER JOIN vehiculos v ON v.id_vehiculo = m.id_vehiculo
     WHERE v.id_tipo_vehiculo = ?
       AND v.activo = TRUE
       AND m.estado <> 'cancelada'
       AND m.fecha_fin >= ${SQL_HOY_BOGOTA}`,
    [idTipoVehiculo],
  );
  return Number(rows[0].total);
}

/**
 * NUEVO: cupos ocupados de todos los tipos en una sola consulta.
 * Devuelve algo como { carro: 12, moto: 3 }. Lo usa el listado (RF06.6).
 */
export async function ocupadosPorTipo(db) {
  const [rows] = await db.query(
    `SELECT tv.codigo, COUNT(DISTINCT m.id_vehiculo) AS total
     FROM mensualidades m
     INNER JOIN vehiculos v ON v.id_vehiculo = m.id_vehiculo
     INNER JOIN tipos_vehiculos tv ON tv.id_tipo_vehiculo = v.id_tipo_vehiculo
     WHERE v.activo = TRUE
       AND m.estado <> 'cancelada'
       AND m.fecha_fin >= ${SQL_HOY_BOGOTA}
     GROUP BY tv.codigo`,
  );
  const r = {};
  for (const f of rows) r[f.codigo] = Number(f.total);
  return r;
}

/** Verifica cupo para una mensualidad NUEVA o tras vencimiento (RF05.9). */
export async function validarCupo(conn, idTipoVehiculo, tipoCodigo) {
  const max = CUPOS_POR_TIPO[tipoCodigo];
  if (!max) return;
  // Serializa pagos concurrentes del mismo tipo para no pasarse del cupo.
  await conn.query(
    `SELECT id_tipo_vehiculo FROM tipos_vehiculos WHERE id_tipo_vehiculo = ? FOR UPDATE`,
    [idTipoVehiculo],
  );
  const ocupados = await contarOcupados(conn, idTipoVehiculo);
  if (ocupados >= max) {
    throw new ErrorNegocio(
      409,
      `Sin cupo disponible para ${tipoCodigo}s (${ocupados}/${max}). No es posible registrar la mensualidad.`,
    );
  }
}

/**
 * Confirma que se recibió el pago de una mensualidad (RF05.1 a RF05.10).
 * El valor sale SIEMPRE de tipos_vehiculos.tarifa_mensual; no se recibe monto ni método.
 * (Sin cambios respecto a la versión anterior.)
 */
export async function registrarPago({ idUsuario, idTurno, placa }) {
  const formato = validarPlaca(placa);
  if (!formato.valida) throw new ErrorNegocio(422, formato.error);
  if (!idUsuario) throw new ErrorNegocio(401, "Usuario no identificado");
  if (!idTurno)
    throw new ErrorNegocio(
      400,
      "Debe tener un turno abierto para confirmar el pago",
    );

  return conTransaccion(async (conn) => {
    // 1. Vehículo
    const [vehRows] = await conn.query(
      `SELECT v.id_vehiculo, v.placa, v.id_tipo_vehiculo, v.activo,
              tv.codigo AS tipo_codigo, tv.nombre AS tipo, tv.tarifa_mensual
       FROM vehiculos v
       INNER JOIN tipos_vehiculos tv ON tv.id_tipo_vehiculo = v.id_tipo_vehiculo
       WHERE v.placa = ? LIMIT 1 FOR UPDATE`,
      [formato.placa],
    );
    if (!vehRows.length) throw new ErrorNegocio(404, "Vehículo no encontrado");
    const v = vehRows[0];
    if (!v.activo) throw new ErrorNegocio(400, "El vehículo está inactivo");

    // 2. Coherencia placa/tipo (RF05.7)
    if (!validarPlaca(v.placa, v.tipo_codigo).valida)
      throw new ErrorNegocio(
        422,
        `La placa ${v.placa} no corresponde al tipo ${v.tipo}`,
      );

    // 3. Valor de referencia (no modificable desde la app)
    const valor = Number(v.tarifa_mensual);
    if (!Number.isFinite(valor) || valor <= 0)
      throw new ErrorNegocio(422, "La tarifa mensual del tipo no es válida");

    // 4. Mensualidad vigente (la que cubre hoy; si no, la más reciente)
    const [mensRows] = await conn.query(
      `${SQL_ULTIMA_MENSUALIDAD} FOR UPDATE`,
      [v.id_vehiculo],
    );
    const vigente = mensRows[0] ?? null;

    // 5. ¿Ya tiene confirmado el siguiente periodo? (RF05.6)
    if (vigente) {
      const [siguientes] = await conn.query(
        `SELECT id_mensualidad FROM mensualidades
         WHERE id_vehiculo = ? AND fecha_inicio > ? AND estado <> 'cancelada'
         LIMIT 1`,
        [v.id_vehiculo, aYMD(vigente.fecha_fin)],
      );
      if (siguientes.length)
        throw new ErrorNegocio(
          409,
          "El vehículo ya tiene confirmado el siguiente periodo",
        );
    }

    // 6. Periodo (misma lógica que la previsualización)
    const plan = planificarPeriodo(vigente, hoyBogota());
    if (!plan.puedePagar)
      throw new ErrorNegocio(
        409,
        `La mensualidad está vigente. Podrá renovar cuando falten ${DIAS_ANTICIPACION_MAX} días o menos (faltan ${plan.diasRestantes}).`,
      );

    // 7. Cupo solo si NO es renovación (RF05.9 / RF05.10)
    if (!plan.esRenovacion)
      await validarCupo(conn, v.id_tipo_vehiculo, v.tipo_codigo);

    // 8. Evitar duplicado por misma fecha de inicio
    const [existentes] = await conn.query(
      `SELECT id_mensualidad FROM mensualidades
       WHERE id_vehiculo = ? AND fecha_inicio = ? AND estado <> 'cancelada' LIMIT 1`,
      [v.id_vehiculo, plan.inicio],
    );
    if (existentes.length)
      throw new ErrorNegocio(
        409,
        "Ya existe una mensualidad registrada para este vehículo en esta fecha",
      );

    // 9. Mensualidad
    let mInsertId;
    try {
      const [mInsert] = await conn.query(
        `INSERT INTO mensualidades
           (id_vehiculo, id_usuario_registro, fecha_inicio, fecha_fin, estado, valor)
         VALUES (?, ?, ?, ?, 'activa', ?)`,
        [v.id_vehiculo, idUsuario, plan.inicio, plan.fin, valor],
      );
      mInsertId = mInsert.insertId;
    } catch (err) {
      if (
        err.code === "ER_DUP_ENTRY" &&
        err.sqlMessage.includes("uq_mens_vehiculo_inicio")
      ) {
        const [old] = await conn.query(
          `SELECT id_mensualidad FROM mensualidades WHERE id_vehiculo = ? AND fecha_inicio = ? AND estado = 'cancelada' LIMIT 1`,
          [v.id_vehiculo, plan.inicio],
        );
        if (old.length) {
          await conn.query(
            `UPDATE mensualidades SET estado = 'activa', id_usuario_registro = ?, valor = ? WHERE id_mensualidad = ?`,
            [idUsuario, valor, old[0].id_mensualidad],
          );
          mInsertId = old[0].id_mensualidad;
        } else throw err;
      } else throw err;
    }

    // 10. Confirmación de pago (quién y en qué turno)
    const [pInsert] = await conn.query(
      `INSERT INTO pagos (id_mensualidad, fecha_pago, monto, id_turno, id_usuario)
       VALUES (?, UTC_TIMESTAMP(), ?, ?, ?)`,
      [mInsertId, valor, idTurno, idUsuario],
    );

    return {
      id_mensualidad: mInsertId,
      id_pago: pInsert.insertId,
      placa: v.placa,
      tipo: v.tipo,
      propietario: null, // lo completa el controller
      periodo: { inicio: plan.inicio, fin: plan.fin },
      valor,
      es_renovacion: plan.esRenovacion,
    };
  });
}

/**
 * NUEVO (RF05.11 y RF05.12): cancela la mensualidad activa de un vehículo.
 * - No se puede si el vehículo está dentro del parqueadero.
 * - No se puede si no tiene mensualidad activa.
 * Cancela la que cubre hoy y también la siguiente si ya estaba pagada.
 * El vehículo queda "Sin mensualidad" y se libera el cupo.
 */
export async function cancelarMensualidad({ placa }) {
  const formato = validarPlaca(placa);
  if (!formato.valida) throw new ErrorNegocio(422, formato.error);

  return conTransaccion(async (conn) => {
    const [vehRows] = await conn.query(
      `SELECT id_vehiculo, placa FROM vehiculos WHERE placa = ? LIMIT 1 FOR UPDATE`,
      [formato.placa],
    );
    if (!vehRows.length) throw new ErrorNegocio(404, "Vehículo no encontrado");
    const v = vehRows[0];

    const [dentro] = await conn.query(
      `SELECT id_acceso FROM accesos_vehiculos WHERE id_vehiculo = ? AND fecha_salida IS NULL LIMIT 1`,
      [v.id_vehiculo],
    );
    if (dentro.length)
      throw new ErrorNegocio(
        400,
        "No se puede cancelar: el vehículo está dentro del parqueadero",
      );

    const [activas] = await conn.query(
      `SELECT id_mensualidad, fecha_inicio, fecha_fin, valor
       FROM mensualidades
       WHERE id_vehiculo = ?
         AND estado <> 'cancelada'
         AND fecha_fin >= ${SQL_HOY_BOGOTA}
       ORDER BY fecha_inicio
       FOR UPDATE`,
      [v.id_vehiculo],
    );
    if (!activas.length)
      throw new ErrorNegocio(
        409,
        "El vehículo no tiene una mensualidad activa para cancelar",
      );

    await conn.query(
      `UPDATE mensualidades SET estado = 'cancelada' WHERE id_mensualidad IN (?)`,
      [activas.map((a) => a.id_mensualidad)],
    );

    return {
      placa: v.placa,
      nuevo_estado: "Sin mensualidad",
      canceladas: activas.length,
      periodo: {
        inicio: aYMD(activas[0].fecha_inicio),
        fin: aYMD(activas[activas.length - 1].fecha_fin),
      },
      valor: activas.reduce((s, a) => s + Number(a.valor), 0),
    };
  });
}

/**
 * RF05.16: elimina un vehículo SIN historial (antes esta función se llamaba
 * "cancelarMensualidad", pero en realidad borraba el vehículo).
 * No permite si está dentro, si tiene accesos o si ya tiene mensualidades.
 */
export async function eliminarVehiculo({ placa }) {
  const formato = validarPlaca(placa);
  if (!formato.valida) throw new ErrorNegocio(422, formato.error);

  return conTransaccion(async (conn) => {
    const [vehRows] = await conn.query(
      `SELECT v.id_vehiculo, v.placa FROM vehiculos v WHERE v.placa = ? LIMIT 1 FOR UPDATE`,
      [formato.placa],
    );
    if (!vehRows.length) throw new ErrorNegocio(404, "Vehículo no encontrado");
    const v = vehRows[0];

    const [dentro] = await conn.query(
      `SELECT id_acceso FROM accesos_vehiculos WHERE id_vehiculo = ? AND fecha_salida IS NULL LIMIT 1`,
      [v.id_vehiculo],
    );
    if (dentro.length)
      throw new ErrorNegocio(
        400,
        "No se puede eliminar: el vehículo está dentro del parqueadero",
      );

    const [accesos] = await conn.query(
      `SELECT id_acceso FROM accesos_vehiculos WHERE id_vehiculo = ? LIMIT 1`,
      [v.id_vehiculo],
    );
    if (accesos.length)
      throw new ErrorNegocio(
        400,
        "No se puede eliminar: el vehículo tiene historial de accesos.",
      );

    // Si tiene mensualidades, también tiene pagos: no se elimina.
    const [mens] = await conn.query(
      "SELECT 1 FROM mensualidades WHERE id_vehiculo = ? LIMIT 1",
      [v.id_vehiculo],
    );
    if (mens.length)
      throw new ErrorNegocio(
        400,
        "No se puede eliminar: el vehículo ya tiene mensualidades o pagos registrados.",
      );

    await conn.query("DELETE FROM vehiculos WHERE id_vehiculo = ?", [
      v.id_vehiculo,
    ]);
    return { placa: v.placa, nuevo_estado: "Eliminado" };
  });
}
