// Movimientos: entrada, salida, reubicación e historial (RF05).
import { pool } from "../config/db.js";
import { validarPlaca, normalizarPlaca } from "../validators/placa.js";
import {
  ESTADO_MENSUALIDAD,
  MENSAJE_BLOQUEO,
  estadoEfectivo,
  puedeIngresar,
  hoyBogota,
  aYMD,
} from "../utils/mensualidad.js";
import { liberarMantenimientosExpirados } from "../utils/celdas.js";
import {
  formatearFechaHora,
  formatearPermanencia,
  sqlFechaBogota,
} from "../utils/fechas.js";
import { paginar, likeSeguro } from "../utils/consultas.js";
import { ErrorNegocio } from "../utils/errores.js";
import { responder } from "../utils/responseHelper.js";
import { MSG } from "../utils/messages.js";

const FECHA_ISO = /^\d{4}-\d{2}-\d{2}$/;

async function puertaActiva(conn) {
  const [rows] = await conn.query(
    `SELECT id_puerta FROM puertas WHERE activa = TRUE ORDER BY id_puerta ASC LIMIT 1`,
  );
  if (!rows.length)
    throw new ErrorNegocio(
      500,
      "No hay puertas activas configuradas en el parqueadero",
    );
  return rows[0].id_puerta;
}

import { getOrCreateTurno } from "../utils/turno.js";

async function operadorYTurno(conn, idUsuario) {
  if (!idUsuario)
    throw new ErrorNegocio(
      401,
      MSG.TOKEN_REQUERIDO,
    );
  const idTurno = await getOrCreateTurno(conn, idUsuario);
  return { idOperador: idUsuario, idTurno };
}

const SQL_AUDIT = `INSERT INTO audit_log (id_usuario, usuario_login, accion, recurso, detalle, ip_address) VALUES (?, ?, ?, 'accesos_vehiculos', ?, ?)`;

/** Rechazos se auditan FUERA de la transacción para que el rollback no los borre. */
async function auditarRechazo(req, { accion, placa }, motivo) {
  try {
    await pool.query(SQL_AUDIT, [
      req.user?.id_usuario ?? null,
      req.user?.usuario_login ?? null,
      `${accion}_rechazada`,
      `Placa ${placa || "N/D"}: ${motivo}`,
      req.ip ?? "desconocida",
    ]);
  } catch (err) {
    console.error("Error al auditar rechazo:", err);
  }
}

const auditar = async (conn, req, accion, detalle) => {
  try {
    await conn.query(SQL_AUDIT, [
      req.user?.id_usuario ?? null,
      req.user?.usuario_login ?? null,
      accion,
      detalle,
      req.ip ?? "desconocida",
    ]);
  } catch (err) {
    console.error(`Error al registrar auditoría (${accion}):`, err);
  }
};

/** Ejecuta `trabajo(conn)` en transacción y traduce errores a HTTP. */
async function ejecutar(req, res, trabajo, ctx = {}) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const { status, body } = await trabajo(conn);
    await conn.commit();
    return responder(res, status, body.mensaje ?? "Operación exitosa", body);
  } catch (err) {
    try {
      await conn.rollback();
    } catch {
      /* conexión cerrada */
    }
    if (err instanceof ErrorNegocio) {
      await auditarRechazo(req, ctx, err.message);
      return responder(res, err.status, err.message);
    }
    if (err.code === "ER_DUP_ENTRY") {
      const msg = String(err.message).includes("uq_acceso_celda_ocupada")
        ? "La celda ya no está disponible"
        : MSG.VEHICULO_DENTRO;
      await auditarRechazo(req, ctx, msg);
      return responder(res, 409, msg);
    }
    console.error("Error en movimiento:", err);
    responder(res, 500, MSG.ERROR_INTERNO);
  } finally {
    conn.release();
  }
}

export const registrarEntrada = (req, res) => {
  const { placa, id_celda } = req.body ?? {};
  if (!placa || !id_celda)
    return responder(res, 422, "Placa y celda requeridos");

  return ejecutar(
    req,
    res,
    async (conn) => {
      const formato = validarPlaca(placa);
      if (!formato.valida) throw new ErrorNegocio(422, formato.error);

      const [vehiculos] = await conn.query(
        `SELECT v.id_vehiculo, v.placa, v.id_tipo_vehiculo, tv.nombre AS tipo, tv.codigo AS tipo_codigo
       FROM vehiculos v INNER JOIN tipos_vehiculos tv ON tv.id_tipo_vehiculo = v.id_tipo_vehiculo
       WHERE v.placa = ? AND v.activo = TRUE LIMIT 1`,
        [formato.placa],
      );
      if (!vehiculos.length)
        throw new ErrorNegocio(404, MSG.NO_ENCONTRADO("Vehículo"));
      const v = vehiculos[0];
      if (!validarPlaca(v.placa, v.tipo_codigo).valida) {
        throw new ErrorNegocio(
          422,
          `La placa ${v.placa} no tiene el formato válido para ${v.tipo}`,
        );
      }

      const [dentro] = await conn.query(
        `SELECT id_acceso FROM accesos_vehiculos WHERE id_vehiculo = ? AND fecha_salida IS NULL LIMIT 1`,
        [v.id_vehiculo],
      );
      if (dentro.length) throw new ErrorNegocio(400, MSG.VEHICULO_DENTRO);

      await liberarMantenimientosExpirados(conn);

      // Consultar todas las mensualidades del vehículo para obtener el estado efectivo
      const [mensualidades] = await conn.query(
        `SELECT id_mensualidad, fecha_inicio, fecha_fin, estado
         FROM mensualidades
         WHERE id_vehiculo = ? AND estado <> 'cancelada'`,
        [v.id_vehiculo],
      );
      const { estado: estadoM } = estadoEfectivo(mensualidades, hoyBogota());
      if (!puedeIngresar(estadoM))
        throw new ErrorNegocio(403, MENSAJE_BLOQUEO[estadoM] ?? "Vehículo sin mensualidad válida");

      const [celdas] = await conn.query(
        `SELECT id_celda, codigo, id_tipo_vehiculo FROM celdas WHERE id_celda = ? AND activa = TRUE AND en_mantenimiento = FALSE LIMIT 1 FOR UPDATE`,
        [id_celda],
      );
      if (!celdas.length) throw new ErrorNegocio(409, "La celda ya no está disponible");
      const c = celdas[0];
      if (c.id_tipo_vehiculo !== v.id_tipo_vehiculo)
        throw new ErrorNegocio(
          422,
          "La celda no es compatible con el tipo de vehículo",
        );

      const [ocupada] = await conn.query(
        `SELECT id_acceso FROM accesos_vehiculos WHERE id_celda = ? AND fecha_salida IS NULL LIMIT 1`,
        [c.id_celda],
      );
      if (ocupada.length) throw new ErrorNegocio(409, "La celda ya no está disponible");

      const { idOperador, idTurno } = await operadorYTurno(
        conn,
        req.user?.id_usuario,
      );
      const idPuerta = await puertaActiva(conn);
      const [r] = await conn.query(
        `INSERT INTO accesos_vehiculos (id_vehiculo, id_celda, id_puerta_ingreso, id_operador_ingreso, id_turno_ingreso) VALUES (?, ?, ?, ?, ?)`,
        [v.id_vehiculo, c.id_celda, idPuerta, idOperador, idTurno],
      );

      await auditar(
        conn,
        req,
        "entrada",
        `Vehículo ${v.placa} ingresó a celda ${c.codigo}`,
      );
      return {
        status: 201,
        body: {
          id: r.insertId,
          placa: v.placa,
          tipo: v.tipo,
          celda: c.codigo,
          accion: "entrada",
          mensaje: "Entrada registrada correctamente",
          ...formatearFechaHora(),
        },
      };
    },
    { accion: "entrada", placa },
  );
};

export const registrarSalida = (req, res) => {
  const { placa } = req.body ?? {};
  if (!placa) return responder(res, 422, "Placa requerida");

  return ejecutar(
    req,
    res,
    async (conn) => {
      const formato = validarPlaca(placa);
      if (!formato.valida) throw new ErrorNegocio(422, formato.error);

      const [vehiculos] = await conn.query(
        `SELECT v.id_vehiculo, v.placa, tv.nombre AS tipo FROM vehiculos v
       INNER JOIN tipos_vehiculos tv ON tv.id_tipo_vehiculo = v.id_tipo_vehiculo WHERE v.placa = ? LIMIT 1`,
        [formato.placa],
      );
      if (!vehiculos.length) throw new ErrorNegocio(404, MSG.VEHICULO_FUERA);
      const v = vehiculos[0];

      const [accesos] = await conn.query(
        `SELECT a.id_acceso, a.fecha_ingreso, c.codigo AS celda, TIMESTAMPDIFF(MINUTE, a.fecha_ingreso, UTC_TIMESTAMP()) AS minutos
       FROM accesos_vehiculos a INNER JOIN celdas c ON c.id_celda = a.id_celda
       WHERE a.id_vehiculo = ? AND a.fecha_salida IS NULL ORDER BY a.fecha_ingreso DESC LIMIT 1 FOR UPDATE`,
        [v.id_vehiculo],
      );
      if (!accesos.length) throw new ErrorNegocio(400, MSG.VEHICULO_FUERA);
      const acceso = accesos[0];

      const { idOperador, idTurno } = await operadorYTurno(
        conn,
        req.user?.id_usuario,
      );
      const idPuerta = await puertaActiva(conn);
      await conn.query(
        `UPDATE accesos_vehiculos SET fecha_salida = UTC_TIMESTAMP(), id_operador_salida = ?, id_puerta_salida = ?, id_turno_salida = ? WHERE id_acceso = ?`,
        [idOperador, idPuerta, idTurno, acceso.id_acceso],
      );

      await auditar(
        conn,
        req,
        "salida",
        `Vehículo ${v.placa} salió de celda ${acceso.celda}`,
      );
      return {
        status: 200,
        body: {
          id: acceso.id_acceso,
          placa: v.placa,
          tipo: v.tipo,
          celda: acceso.celda,
          accion: "salida",
          mensaje: "Salida registrada correctamente",
          fecha_ingreso: formatearFechaHora(acceso.fecha_ingreso),
          permanencia: formatearPermanencia(acceso.minutos),
          ...formatearFechaHora(),
        },
      };
    },
    { accion: "salida", placa },
  );
};

export const listarDentro = async (req, res) => {
  try {
    const q = String(req.query.q ?? "").trim();
    if (!q)
      return responder(res, 422, "Ingrese una placa o un documento");
    const [rows] = await pool.query(
      `SELECT a.id_acceso, v.placa, v.propietario_nombre, v.propietario_documento, tv.nombre AS tipo, tv.codigo AS tipo_codigo,
              c.codigo AS celda, a.fecha_ingreso, UTC_TIMESTAMP() AS ahora, TIMESTAMPDIFF(MINUTE, a.fecha_ingreso, UTC_TIMESTAMP()) AS minutos
       FROM accesos_vehiculos a
       INNER JOIN vehiculos v ON v.id_vehiculo = a.id_vehiculo
       INNER JOIN tipos_vehiculos tv ON tv.id_tipo_vehiculo = v.id_tipo_vehiculo
       INNER JOIN celdas c ON c.id_celda = a.id_celda
       WHERE a.fecha_salida IS NULL AND (v.placa = ? OR v.propietario_documento = ?) ORDER BY a.fecha_ingreso`,
      [normalizarPlaca(q), q],
    );
    if (!rows.length) return responder(res, 404, MSG.VEHICULO_FUERA);
    const data = rows.map((r) => ({
      id_acceso: r.id_acceso,
      placa: r.placa,
      propietario: r.propietario_nombre,
      documento: r.propietario_documento,
      tipo: r.tipo,
      tipoCodigo: r.tipo_codigo,
      celda: r.celda,
      entrada: formatearFechaHora(r.fecha_ingreso),
      salida: formatearFechaHora(r.ahora),
      permanencia: formatearPermanencia(r.minutos),
    }));
    return responder(res, 200, MSG.LISTADO("Vehículos dentro"), { data });
  } catch (err) {
    console.error(err);
    responder(res, 500, MSG.ERROR_INTERNO);
  }
};

export const registrarReubicacion = (req, res) => {
  const idAcceso = Number(req.params.id_acceso);
  const idCelda = Number(req.body?.id_celda);
  if (!Number.isInteger(idAcceso) || idAcceso < 1)
    return responder(res, 422, "Acceso requerido");
  if (!Number.isInteger(idCelda) || idCelda < 1)
    return responder(res, 422, "Celda requerida");

  return ejecutar(
    req,
    res,
    async (conn) => {
      if (!req.user?.id_usuario)
        throw new ErrorNegocio(
          401,
          MSG.TOKEN_REQUERIDO,
        );
      await liberarMantenimientosExpirados(conn);

      const [accesos] = await conn.query(
        `SELECT a.id_acceso, v.placa, v.id_tipo_vehiculo, co.codigo AS celda_origen
       FROM accesos_vehiculos a INNER JOIN vehiculos v ON v.id_vehiculo = a.id_vehiculo INNER JOIN celdas co ON co.id_celda = a.id_celda
       WHERE a.id_acceso = ? AND a.fecha_salida IS NULL LIMIT 1 FOR UPDATE`,
        [idAcceso],
      );
      if (!accesos.length)
        throw new ErrorNegocio(
          404,
          "Acceso no encontrado o el vehículo ya salió",
        );
      const acceso = accesos[0];

      const [celdas] = await conn.query(
        `SELECT id_celda, codigo FROM celdas WHERE id_celda = ? AND activa = TRUE AND en_mantenimiento = FALSE AND id_tipo_vehiculo = ? LIMIT 1 FOR UPDATE`,
        [idCelda, acceso.id_tipo_vehiculo],
      );
      if (!celdas.length)
        throw new ErrorNegocio(
          422,
          "La celda no existe, no está habilitada o no es del tipo del vehículo",
        );
      const c = celdas[0];

      const [ocupada] = await conn.query(
        `SELECT id_acceso FROM accesos_vehiculos WHERE id_celda = ? AND fecha_salida IS NULL LIMIT 1`,
        [c.id_celda],
      );
      if (ocupada.length) throw new ErrorNegocio(409, "La celda ya no está disponible");

      // Antes se llamaba operadorYTurno solo para obtener el id (creando turnos innecesarios).
      await conn.query(
        `UPDATE accesos_vehiculos SET id_celda = ? WHERE id_acceso = ?`,
        [c.id_celda, acceso.id_acceso],
      );
      await auditar(
        conn,
        req,
        "reubicacion",
        `Vehículo ${acceso.placa} reubicado de celda ${acceso.celda_origen} a celda ${c.codigo}`,
      );
      return {
        status: 200,
        body: {
          id: acceso.id_acceso,
          placa: acceso.placa,
          celda_origen: acceso.celda_origen,
          celda: c.codigo,
          accion: "reubicacion",
          mensaje: "Vehículo reubicado correctamente",
        },
      };
    },
    { accion: "reubicacion" },
  );
};

export const listarAccesos = async (req, res) => {
  try {
    const { page, limit, offset } = paginar(req.query);
    const placa = String(req.query.placa ?? "")
      .trim()
      .toUpperCase();
    const celda = String(req.query.celda ?? "")
      .trim()
      .toUpperCase();
    const operador = String(req.query.operador ?? "").trim();
    const estado = String(req.query.estado ?? "")
      .trim()
      .toLowerCase();
    const desde = String(req.query.fecha_desde ?? "").trim();
    const hasta = String(req.query.fecha_hasta ?? "").trim();
    for (const f of [desde, hasta]) {
      if (f && !FECHA_ISO.test(f))
        return responder(res, 422, "Las fechas deben tener formato AAAA-MM-DD");
    }

    const conds = [],
      params = [];
    if (placa) {
      conds.push(`v.placa LIKE ?`);
      params.push(likeSeguro(placa));
    }
    if (celda) {
      conds.push(`c.codigo LIKE ?`);
      params.push(likeSeguro(celda));
    }
    if (operador) {
      conds.push(
        `(ui.nombres LIKE ? OR ui.apellidos LIKE ? OR us.nombres LIKE ? OR us.apellidos LIKE ?)`,
      );
      const like = likeSeguro(operador);
      params.push(like, like, like, like);
    }
    if (estado === "adentro" || estado === "fuera") {
      conds.push(
        estado === "adentro"
          ? `a.fecha_salida IS NULL`
          : `a.fecha_salida IS NOT NULL`,
      );
      conds.push(
        `a.id_acceso = (SELECT MAX(a2.id_acceso) FROM accesos_vehiculos a2 WHERE a2.id_vehiculo = a.id_vehiculo)`,
      );
    }
    if (desde) {
      conds.push(`${sqlFechaBogota("a.fecha_ingreso")} >= ?`);
      params.push(desde);
    }
    if (hasta) {
      conds.push(`${sqlFechaBogota("a.fecha_ingreso")} <= ?`);
      params.push(hasta);
    }

    const where = conds.length ? `WHERE ${conds.join(" AND ")}` : "";
    const FROM = `FROM accesos_vehiculos a
      INNER JOIN vehiculos v ON v.id_vehiculo = a.id_vehiculo
      INNER JOIN celdas c ON c.id_celda = a.id_celda
      INNER JOIN usuarios ui ON ui.id_usuario = a.id_operador_ingreso
      LEFT JOIN usuarios us ON us.id_usuario = a.id_operador_salida ${where}`;

    const [rows] = await pool.query(
      `SELECT a.id_acceso, v.placa, v.propietario_nombre, c.codigo AS celda,
              ui.nombres AS operador_ingreso_nombres, ui.apellidos AS operador_ingreso_apellidos,
              us.nombres AS operador_salida_nombres, us.apellidos AS operador_salida_apellidos, a.fecha_ingreso, a.fecha_salida
       ${FROM} ORDER BY a.fecha_ingreso DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    );
    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total ${FROM}`,
      params,
    );
    return responder(res, 200, MSG.LISTADO("Historial de accesos"), { rows, total: Number(total), page, limit });
  } catch (err) {
    console.error(err);
    responder(res, 500, MSG.ERROR_INTERNO);
  }
};

export default {
  registrarEntrada,
  registrarSalida,
  listarDentro,
  registrarReubicacion,
  listarAccesos,
};
