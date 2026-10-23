// backend/src/controllers/movimientoController.js
// POST /api/movimientos/entrada   body: { placa, id_celda }
// POST /api/movimientos/salida    body: { placa }
//
// API abierta (sin JWT): se usa el primer operador activo y, si no tiene turno
// abierto, se crea uno automaticamente.
//
// La disponibilidad de una celda no se guarda en la tabla celdas: esta ocupada
// si existe un acceso con fecha_salida IS NULL. Los indices unicos
// uq_acceso_vehiculo_dentro y uq_acceso_celda_ocupada del esquema impiden
// duplicados incluso con peticiones simultaneas.

import { pool } from "../config/db.js";
import { validarPlaca } from "../validators/placa.js";

const ID_PUERTA_DEFECTO = 1; // el seed crea la puerta 1
const ZONA_HORARIA = "America/Bogota";

class ErrorNegocio extends Error {
  constructor(status, mensaje) {
    super(mensaje);
    this.status = status;
  }
}

const fechaHoraActual = () => {
  const ahora = new Date();
  return {
    fecha: ahora.toLocaleDateString("es-CO", { timeZone: ZONA_HORARIA }),
    hora: ahora.toLocaleTimeString("es-CO", {
      timeZone: ZONA_HORARIA,
      hour: "2-digit",
      minute: "2-digit",
    }),
  };
};

// Operador por defecto + su turno abierto (se crea si no existe)
async function operadorYTurno(conn) {
  const [ops] = await conn.query(
    `SELECT id_usuario FROM usuarios
     WHERE rol = 'operador' AND estado = 'activo'
     ORDER BY id_usuario LIMIT 1`,
  );
  if (ops.length === 0) {
    throw new ErrorNegocio(
      500,
      "No hay un operador activo. Ejecuta: npm run seed",
    );
  }
  const idOperador = ops[0].id_usuario;

  const [turnos] = await conn.query(
    `SELECT id_turno FROM turnos
     WHERE id_usuario = ? AND estado = 'abierto' LIMIT 1`,
    [idOperador],
  );
  if (turnos.length > 0) return { idOperador, idTurno: turnos[0].id_turno };

  const [r] = await conn.query(
    `INSERT INTO turnos (id_usuario, estado, base_inicial) VALUES (?, 'abierto', 0)`,
    [idOperador],
  );
  return { idOperador, idTurno: r.insertId };
}

// Ejecuta "trabajo" dentro de una transaccion y centraliza el manejo de errores
async function ejecutar(res, trabajo) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const { status, body } = await trabajo(conn);
    await conn.commit();
    res.status(status).json(body);
  } catch (err) {
    try {
      await conn.rollback();
    } catch {
      /* conexion ya cerrada */
    }
    if (err instanceof ErrorNegocio) {
      return res.status(err.status).json({ error: err.message });
    }
    if (err.code === "ER_DUP_ENTRY") {
      return res
        .status(409)
        .json({
          error: "El vehículo ya está adentro o la celda ya fue ocupada",
        });
    }
    console.error("Error en movimiento:", err);
    res.status(500).json({ error: "Error interno al registrar el movimiento" });
  } finally {
    conn.release();
  }
}

export const registrarEntrada = (req, res) => {
  const { placa, id_celda } = req.body ?? {};
  if (!placa || !id_celda) {
    return res.status(400).json({ error: "Placa y celda requeridos" });
  }

  return ejecutar(res, async (conn) => {
    // 0. Formato de la placa (se rechaza antes de tocar la base de datos)
    const formato = validarPlaca(placa);
    if (!formato.valida) throw new ErrorNegocio(400, formato.error);

    // 1. Vehiculo
    const [vehiculos] = await conn.query(
      `SELECT v.id_vehiculo, v.placa, v.id_tipo_vehiculo, tv.nombre AS tipo,
              tv.codigo AS tipo_codigo
       FROM vehiculos v
       INNER JOIN tipos_vehiculos tv ON tv.id_tipo_vehiculo = v.id_tipo_vehiculo
       WHERE v.placa = ? AND v.activo = TRUE
       LIMIT 1`,
      [formato.placa],
    );
    if (vehiculos.length === 0)
      throw new ErrorNegocio(404, "Vehículo no encontrado");
    const v = vehiculos[0];

    // 1.1 El formato de la placa debe corresponder al tipo registrado
    if (!validarPlaca(v.placa, v.tipo_codigo).valida) {
      throw new ErrorNegocio(
        400,
        `La placa ${v.placa} no tiene el formato válido para ${v.tipo}`,
      );
    }

    // 2. No debe estar ya adentro
    const [dentro] = await conn.query(
      `SELECT id_acceso FROM accesos_vehiculos
       WHERE id_vehiculo = ? AND fecha_salida IS NULL LIMIT 1`,
      [v.id_vehiculo],
    );
    if (dentro.length > 0)
      throw new ErrorNegocio(400, "El vehículo ya está adentro");

    // 2.1 Solo entran vehiculos con mensualidad vigente
    const [mensualidad] = await conn.query(
      `SELECT (fecha_fin >= CURRENT_DATE()) AS vigente
       FROM mensualidades
       WHERE id_vehiculo = ? AND estado = 'activa'
       ORDER BY fecha_fin DESC LIMIT 1`,
      [v.id_vehiculo],
    );
    if (!mensualidad.length) {
      throw new ErrorNegocio(403, "El vehículo no tiene mensualidad activa");
    }
    if (!mensualidad[0].vigente) {
      throw new ErrorNegocio(403, "La mensualidad del vehículo está en mora");
    }

    // 3. Celda activa, sin mantenimiento y del mismo tipo
    const [celdas] = await conn.query(
      `SELECT id_celda, codigo, id_tipo_vehiculo FROM celdas
       WHERE id_celda = ? AND activa = TRUE AND en_mantenimiento = FALSE
       LIMIT 1`,
      [id_celda],
    );
    if (celdas.length === 0) {
      throw new ErrorNegocio(400, "La celda no existe o no está habilitada");
    }
    const c = celdas[0];
    if (c.id_tipo_vehiculo !== v.id_tipo_vehiculo) {
      throw new ErrorNegocio(
        400,
        "La celda no es compatible con el tipo de vehículo",
      );
    }

    // 4. Celda libre (sin acceso abierto)
    const [ocupada] = await conn.query(
      `SELECT id_acceso FROM accesos_vehiculos
       WHERE id_celda = ? AND fecha_salida IS NULL LIMIT 1`,
      [c.id_celda],
    );
    if (ocupada.length > 0)
      throw new ErrorNegocio(400, "La celda ya está ocupada");

    // 5. Operador y turno
    const { idOperador, idTurno } = await operadorYTurno(conn);

    // 6. Registrar el acceso
    const [r] = await conn.query(
      `INSERT INTO accesos_vehiculos
         (id_vehiculo, id_celda, id_puerta_ingreso, id_operador_ingreso, id_turno_ingreso)
       VALUES (?, ?, ?, ?, ?)`,
      [v.id_vehiculo, c.id_celda, ID_PUERTA_DEFECTO, idOperador, idTurno],
    );

    return {
      status: 201,
      body: {
        id: r.insertId,
        placa: v.placa,
        tipo: v.tipo,
        celda: c.codigo,
        accion: "entrada",
        ...fechaHoraActual(),
      },
    };
  });
};

export const registrarSalida = (req, res) => {
  const { placa } = req.body ?? {};
  if (!placa) return res.status(400).json({ error: "Placa requerida" });

  return ejecutar(res, async (conn) => {
    // 0. Formato de la placa
    const formato = validarPlaca(placa);
    if (!formato.valida) throw new ErrorNegocio(400, formato.error);

    // 1. Vehiculo
    const [vehiculos] = await conn.query(
      `SELECT v.id_vehiculo, v.placa, tv.nombre AS tipo, tv.codigo AS tipo_codigo
       FROM vehiculos v
       INNER JOIN tipos_vehiculos tv ON tv.id_tipo_vehiculo = v.id_tipo_vehiculo
       WHERE v.placa = ?
       LIMIT 1`,
      [formato.placa],
    );
    if (vehiculos.length === 0)
      throw new ErrorNegocio(404, "Vehículo no encontrado");
    const v = vehiculos[0];

    // 1.1 El formato de la placa debe corresponder al tipo registrado
    if (!validarPlaca(v.placa, v.tipo_codigo).valida) {
      throw new ErrorNegocio(
        400,
        `La placa ${v.placa} no tiene el formato válido para ${v.tipo}`,
      );
    }

    // 2. Acceso abierto (con el codigo de la celda)
    const [accesos] = await conn.query(
      `SELECT a.id_acceso, c.codigo AS celda
       FROM accesos_vehiculos a
       INNER JOIN celdas c ON c.id_celda = a.id_celda
       WHERE a.id_vehiculo = ? AND a.fecha_salida IS NULL
       ORDER BY a.fecha_ingreso DESC
       LIMIT 1`,
      [v.id_vehiculo],
    );
    if (accesos.length === 0)
      throw new ErrorNegocio(400, "El vehículo no está adentro");
    const acceso = accesos[0];

    // 3. Operador y turno
    const { idOperador, idTurno } = await operadorYTurno(conn);

    // 4. Cerrar el acceso: con fecha_salida la celda queda libre de inmediato
    await conn.query(
      `UPDATE accesos_vehiculos
       SET fecha_salida = UTC_TIMESTAMP(),
           id_operador_salida = ?,
           id_puerta_salida = ?,
           id_turno_salida = ?
       WHERE id_acceso = ?`,
      [idOperador, ID_PUERTA_DEFECTO, idTurno, acceso.id_acceso],
    );

    return {
      status: 200,
      body: {
        id: acceso.id_acceso,
        placa: v.placa,
        tipo: v.tipo,
        celda: acceso.celda,
        accion: "salida",
        ...fechaHoraActual(),
      },
    };
  });
};
