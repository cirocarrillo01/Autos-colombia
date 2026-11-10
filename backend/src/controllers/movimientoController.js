//backend/src/controllers/movimientoController.js
// Movimientos: entrada, salida, reubicación y consultas de historial (RF05).
// Todas las rutas requieren autenticación JWT.

import { pool } from "../config/db.js";
import { validarPlaca, normalizarPlaca } from "../validators/placa.js";
import { SQL_ULTIMA_MENSUALIDAD } from "../utils/mensualidad.js";

const ZONA_HORARIA = "America/Bogota";

const MSG = {
  YA_DENTRO: "El vehículo ya se encuentra dentro del parqueadero",
  NO_DENTRO: "El vehículo no se encuentra en el parqueadero",
  CELDA_NO_DISPONIBLE: "La celda ya no está disponible",
  MENSUALIDAD_MORA: "La mensualidad del vehículo está en mora",
  MENSUALIDAD_PENDIENTE: "La mensualidad del vehículo aún no inicia",
  SIN_MENSUALIDAD: "El vehículo no tiene mensualidad activa",
};

/**
 * @class ErrorNegocio
 * @extends Error
 * @description Clase para manejar errores controlados de lógica de negocio (4xx/5xx).
 * @property {number} status - Código de estado HTTP.
 */
class ErrorNegocio extends Error {
  constructor(status, mensaje) {
    super(mensaje);
    this.status = status;
  }
}

/**
 * @function fechaHoraActual
 * @description Genera la fecha y hora actual formateada para la zona horaria de Colombia.
 * @returns {{fecha: string, hora: string}} Objeto con fecha (DD/MM/AAAA) y hora (HH:mm).
 */
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

const formatearFechaHora = (d) => ({
  fecha: new Date(d).toLocaleDateString("es-CO", { timeZone: ZONA_HORARIA }),
  hora: new Date(d).toLocaleTimeString("es-CO", {
    timeZone: ZONA_HORARIA, hour: "2-digit", minute: "2-digit",
  }),
});

const formatearPermanencia = (min) => {
  const m = Math.max(Number(min) || 0, 0);
  const d = Math.floor(m / 1440), h = Math.floor((m % 1440) / 60), r = m % 60;
  return [d && `${d} d`, (d || h) && `${h} h`, `${r} min`].filter(Boolean).join(" ");
};

/**
 * @function puertaActiva
 * @description Consulta en la base de datos la primera puerta marcada como activa.
 * @param {import('mysql2/promise').Connection} conn - Conexión de base de datos activa.
 * @throws {ErrorNegocio} Si no hay ninguna puerta activa configurada (500).
 * @returns {Promise<number>} ID de la puerta activa.
 */
async function puertaActiva(conn) {
  const [rows] = await conn.query(
    `SELECT id_puerta FROM puertas WHERE activa = TRUE
     ORDER BY id_puerta ASC LIMIT 1`,
  );
  if (rows.length === 0) {
    throw new ErrorNegocio(
      500,
      "No hay puertas activas configuradas en el parqueadero",
    );
  }
  return rows[0].id_puerta;
}

/**
 * @function operadorYTurno
 * @description Resuelve el operador y busca un turno abierto para él. Si no existe, lo crea.
 * @param {import('mysql2/promise').Connection} conn - Conexión de base de datos activa.
 * @param {number|undefined} idUsuario - ID del usuario autenticado.
 * @throws {ErrorNegocio} Si no hay sesión de usuario (401).
 * @returns {Promise<{idOperador: number, idTurno: number}>}
 */
async function operadorYTurno(conn, idUsuario) {
  if (!idUsuario) {
    throw new ErrorNegocio(
      401,
      "Sesión requerida para registrar el movimiento",
    );
  }

  const [turnos] = await conn.query(
    `SELECT id_turno FROM turnos
     WHERE id_usuario = ? AND estado = 'abierto' LIMIT 1`,
    [idUsuario],
  );
  if (turnos.length > 0)
    return { idOperador: idUsuario, idTurno: turnos[0].id_turno };

  const [r] = await conn.query(
    `INSERT INTO turnos (id_usuario, estado, base_inicial) VALUES (?, 'abierto', 0)`,
    [idUsuario],
  );
  return { idOperador: idUsuario, idTurno: r.insertId };
}

/**
 * Registra un intento rechazado FUERA de la transacción para que el rollback no lo borre.
 */
async function auditarRechazo(req, { accion, placa }, motivo) {
  try {
    await pool.query(
      `INSERT INTO audit_log
         (id_usuario, usuario_login, accion, recurso, detalle, ip_address)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        req.user?.id_usuario ?? null,
        req.user?.usuario_login ?? null,
        `${accion}_rechazada`,
        "accesos_vehiculos",
        `Placa ${placa || "N/D"}: ${motivo}`,
        req.ip ?? "desconocida",
      ],
    );
  } catch (err) {
    console.error("Error al auditar rechazo:", err);
  }
}

/**
 * @function ejecutar
 * @description Wrapper para ejecutar operaciones dentro de una transacción gestionada.
 * Maneja el commit, rollback automático y centraliza la respuesta de errores.
 */
async function ejecutar(req, res, trabajo, ctx = {}) {
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
      /* conexión ya cerrada */
    }
    if (err instanceof ErrorNegocio) {
      await auditarRechazo(req, ctx, err.message);
      return res.status(err.status).json({ error: err.message });
    }
    if (err.code === "ER_DUP_ENTRY") {
      const esCelda = String(err.message).includes("uq_acceso_celda_ocupada");
      const msg = esCelda ? MSG.CELDA_NO_DISPONIBLE : MSG.YA_DENTRO;
      await auditarRechazo(req, ctx, msg);
      return res.status(409).json({ error: msg });
    }
    console.error("Error en movimiento:", err);
    res.status(500).json({ error: "Error interno al registrar el movimiento" });
  } finally {
    conn.release();
  }
}

/**
 * @function auditar
 * @description Registra una acción en la tabla audit_log dentro de la transacción actual.
 */
async function auditar(conn, { idUsuario, login, accion, detalle, ip }) {
  try {
    await conn.query(
      `INSERT INTO audit_log
         (id_usuario, usuario_login, accion, recurso, detalle, ip_address)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        idUsuario ?? null,
        login ?? null,
        accion,
        "accesos_vehiculos",
        detalle,
        ip ?? "desconocida",
      ],
    );
  } catch (err) {
    console.error(`Error al registrar auditoría (${accion}):`, err);
  }
}

/**
 * @function registrarEntrada
 * @description Procesa el ingreso de un vehículo.
 */
export const registrarEntrada = (req, res) => {
  const { placa, id_celda } = req.body ?? {};
  if (!placa || !id_celda) {
    return res.status(400).json({ error: "Placa y celda requeridos" });
  }

  return ejecutar(req, res, async (conn) => {
    const formato = validarPlaca(placa);
    if (!formato.valida) throw new ErrorNegocio(400, formato.error);

    const [vehiculos] = await conn.query(
      `SELECT v.id_vehiculo, v.placa, v.id_tipo_vehiculo,
              tv.nombre AS tipo, tv.codigo AS tipo_codigo
       FROM vehiculos v
       INNER JOIN tipos_vehiculos tv ON tv.id_tipo_vehiculo = v.id_tipo_vehiculo
       WHERE v.placa = ? AND v.activo = TRUE
       LIMIT 1`,
      [formato.placa],
    );
    if (vehiculos.length === 0)
      throw new ErrorNegocio(404, "Vehículo no encontrado");
    const v = vehiculos[0];

    if (!validarPlaca(v.placa, v.tipo_codigo).valida) {
      throw new ErrorNegocio(
        400,
        `La placa ${v.placa} no tiene el formato válido para ${v.tipo}`,
      );
    }

    const [dentro] = await conn.query(
      `SELECT id_acceso FROM accesos_vehiculos
       WHERE id_vehiculo = ? AND fecha_salida IS NULL LIMIT 1`,
      [v.id_vehiculo],
    );
    if (dentro.length > 0)
      throw new ErrorNegocio(400, MSG.YA_DENTRO);

    await conn.query(
      `UPDATE celdas
       SET en_mantenimiento = FALSE, mantenimiento_hasta = NULL
       WHERE en_mantenimiento = TRUE
         AND mantenimiento_hasta IS NOT NULL
         AND mantenimiento_hasta <= UTC_TIMESTAMP()`,
    );

    // Vigencia: fecha_inicio <= hoy <= fecha_fin
    const [mensualidad] = await conn.query(SQL_ULTIMA_MENSUALIDAD, [
      v.id_vehiculo,
    ]);
    if (!mensualidad.length) {
      throw new ErrorNegocio(403, "El vehículo no tiene mensualidad activa");
    }
    if (!mensualidad[0].vigente) {
      throw new ErrorNegocio(403, "La mensualidad del vehículo está en mora");
    }
    
    // Validar fechas específicamente para el mensaje de error
    const [celdas] = await conn.query(
      `SELECT id_celda, codigo, id_tipo_vehiculo FROM celdas
       WHERE id_celda = ? AND activa = TRUE AND en_mantenimiento = FALSE
       LIMIT 1 FOR UPDATE`,
      [id_celda],
    );
    if (celdas.length === 0) {
      throw new ErrorNegocio(409, MSG.CELDA_NO_DISPONIBLE);
    }
    const c = celdas[0];
    if (c.id_tipo_vehiculo !== v.id_tipo_vehiculo) {
      throw new ErrorNegocio(
        400,
        "La celda no es compatible con el tipo de vehículo",
      );
    }

    const [ocupada] = await conn.query(
      `SELECT id_acceso FROM accesos_vehiculos
       WHERE id_celda = ? AND fecha_salida IS NULL LIMIT 1`,
      [c.id_celda],
    );
    if (ocupada.length > 0)
      throw new ErrorNegocio(409, MSG.CELDA_NO_DISPONIBLE);

    const { idOperador, idTurno } = await operadorYTurno(
      conn,
      req.user?.id_usuario,
    );
    const idPuerta = await puertaActiva(conn);

    const [r] = await conn.query(
      `INSERT INTO accesos_vehiculos
         (id_vehiculo, id_celda, id_puerta_ingreso, id_operador_ingreso, id_turno_ingreso)
       VALUES (?, ?, ?, ?, ?)`,
      [v.id_vehiculo, c.id_celda, idPuerta, idOperador, idTurno],
    );
    const idAcceso = r.insertId;

    await auditar(conn, {
      idUsuario: idOperador,
      login: req.user?.usuario_login,
      accion: "entrada",
      detalle: `Vehículo ${v.placa} ingresó a celda ${c.codigo}`,
      ip: req.ip,
    });

    return {
      status: 201,
      body: {
        id: idAcceso,
        placa: v.placa,
        tipo: v.tipo,
        celda: c.codigo,
        accion: "entrada",
        mensaje: "Entrada registrada correctamente",
        ...fechaHoraActual(),
      },
    };
  }, { accion: "entrada", placa });
};

/**
 * @function registrarSalida
 * @description Procesa la salida de un vehículo.
 */
export const registrarSalida = (req, res) => {
  const { placa } = req.body ?? {};
  if (!placa) return res.status(400).json({ error: "Placa requerida" });

  return ejecutar(req, res, async (conn) => {
    const formato = validarPlaca(placa);
    if (!formato.valida) throw new ErrorNegocio(400, formato.error);

    const [vehiculos] = await conn.query(
      `SELECT v.id_vehiculo, v.placa, tv.nombre AS tipo, tv.codigo AS tipo_codigo
       FROM vehiculos v
       INNER JOIN tipos_vehiculos tv ON tv.id_tipo_vehiculo = v.id_tipo_vehiculo
       WHERE v.placa = ?
       LIMIT 1`,
      [formato.placa],
    );
    if (vehiculos.length === 0)
      throw new ErrorNegocio(404, MSG.NO_DENTRO);
    const v = vehiculos[0];

    const [accesos] = await conn.query(
      `SELECT a.id_acceso, a.fecha_ingreso, c.codigo AS celda,
              TIMESTAMPDIFF(MINUTE, a.fecha_ingreso, UTC_TIMESTAMP()) AS minutos
       FROM accesos_vehiculos a
       INNER JOIN celdas c ON c.id_celda = a.id_celda
       WHERE a.id_vehiculo = ? AND a.fecha_salida IS NULL
       ORDER BY a.fecha_ingreso DESC
       LIMIT 1 FOR UPDATE`,
      [v.id_vehiculo],
    );
    if (accesos.length === 0)
      throw new ErrorNegocio(400, MSG.NO_DENTRO);
    const acceso = accesos[0];

    const { idOperador, idTurno } = await operadorYTurno(
      conn,
      req.user?.id_usuario,
    );
    const idPuerta = await puertaActiva(conn);

    await conn.query(
      `UPDATE accesos_vehiculos
       SET fecha_salida = UTC_TIMESTAMP(),
           id_operador_salida = ?,
           id_puerta_salida = ?,
           id_turno_salida = ?
       WHERE id_acceso = ?`,
      [idOperador, idPuerta, idTurno, acceso.id_acceso],
    );

    await auditar(conn, {
      idUsuario: idOperador,
      login: req.user?.usuario_login,
      accion: "salida",
      detalle: `Vehículo ${v.placa} salió de celda ${acceso.celda}`,
      ip: req.ip,
    });

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
        ...fechaHoraActual(),
      },
    };
  }, { accion: "salida", placa });
};

/**
 * @function listarDentro
 * @description Lista vehículos que se encuentran dentro del parqueadero por placa o documento.
 */
export const listarDentro = async (req, res) => {
  try {
    const q = String(req.query.q ?? "").trim();
    if (!q) return res.status(400).json({ error: "Ingrese una placa o un documento" });

    const [rows] = await pool.query(
      `SELECT a.id_acceso, v.placa, v.propietario_nombre, v.propietario_documento,
              tv.nombre AS tipo, tv.codigo AS tipo_codigo, c.codigo AS celda,
              a.fecha_ingreso, UTC_TIMESTAMP() AS ahora,
              TIMESTAMPDIFF(MINUTE, a.fecha_ingreso, UTC_TIMESTAMP()) AS minutos
       FROM accesos_vehiculos a
       INNER JOIN vehiculos v ON v.id_vehiculo = a.id_vehiculo
       INNER JOIN tipos_vehiculos tv ON tv.id_tipo_vehiculo = v.id_tipo_vehiculo
       INNER JOIN celdas c ON c.id_celda = a.id_celda
       WHERE a.fecha_salida IS NULL
         AND (v.placa = ? OR v.propietario_documento = ?)
       ORDER BY a.fecha_ingreso`,
      [normalizarPlaca(q), q],
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: MSG.NO_DENTRO });
    }
    res.json(rows.map((r) => ({
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
    })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al buscar vehículos dentro" });
  }
};

export const registrarReubicacion = async (req, res) => {
  const { id_acceso } = req.params ?? {};
  const { id_celda } = req.body ?? {};
  if (!id_acceso) return res.status(400).json({ error: "Acceso requerido" });
  if (!id_celda) return res.status(400).json({ error: "Celda requerida" });

  return ejecutar(req, res, async (conn) => {
    await conn.query(
      `UPDATE celdas
       SET en_mantenimiento = FALSE, mantenimiento_hasta = NULL
       WHERE en_mantenimiento = TRUE
         AND mantenimiento_hasta IS NOT NULL
         AND mantenimiento_hasta <= UTC_TIMESTAMP()`,
    );

    const [accesos] = await conn.query(
      `SELECT a.id_acceso, a.id_vehiculo, v.placa, v.id_tipo_vehiculo,
              co.codigo AS celda_origen
       FROM accesos_vehiculos a
       INNER JOIN vehiculos v ON v.id_vehiculo = a.id_vehiculo
       INNER JOIN celdas co ON co.id_celda = a.id_celda
       WHERE a.id_acceso = ? AND a.fecha_salida IS NULL
       LIMIT 1`,
      [id_acceso],
    );
    if (accesos.length === 0)
      throw new ErrorNegocio(
        404,
        "Acceso no encontrado o el vehículo ya salió",
      );
    const acceso = accesos[0];

    const [celdas] = await conn.query(
      `SELECT id_celda, codigo FROM celdas
       WHERE id_celda = ? AND activa = TRUE AND en_mantenimiento = FALSE
         AND id_tipo_vehiculo = ?
       LIMIT 1 FOR UPDATE`,
      [id_celda, acceso.id_tipo_vehiculo],
    );
    if (celdas.length === 0)
      throw new ErrorNegocio(
        400,
        "La celda no existe, no está habilitada o no es del tipo del vehículo",
      );
    const c = celdas[0];

    const [ocupada] = await conn.query(
      `SELECT id_acceso FROM accesos_vehiculos
       WHERE id_celda = ? AND fecha_salida IS NULL LIMIT 1`,
      [c.id_celda],
    );
    if (ocupada.length > 0)
      throw new ErrorNegocio(409, MSG.CELDA_NO_DISPONIBLE);

    const { idOperador } = await operadorYTurno(conn, req.user?.id_usuario);

    await conn.query(
      `UPDATE accesos_vehiculos SET id_celda = ? WHERE id_acceso = ?`,
      [c.id_celda, acceso.id_acceso],
    );

    await auditar(conn, {
      idUsuario: idOperador,
      login: req.user?.usuario_login,
      accion: "reubicacion",
      detalle: `Vehículo ${acceso.placa} reubicado de celda ${acceso.celda_origen} a celda ${c.codigo}`,
      ip: req.ip,
    });

    return {
      status: 200,
      body: {
        id: acceso.id_acceso,
        placa: acceso.placa,
        celda_origen: acceso.celda_origen,
        celda: c.codigo,
        accion: "reubicacion",
      },
    };
  }, { accion: "reubicacion" });
};

export const listarAccesos = async (req, res) => {
  try {
    const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.max(
      Math.min(Number.parseInt(req.query.limit, 10) || 20, 100),
      1,
    );
    const offset = (page - 1) * limit;

    const placa = String(req.query.placa ?? "").trim().toUpperCase();
    const celda = String(req.query.celda ?? "").trim().toUpperCase();
    const operador = String(req.query.operador ?? "").trim();
    const estado = String(req.query.estado ?? "").trim().toLowerCase();
    const fechaDesde = String(req.query.fecha_desde ?? "").trim();
    const fechaHasta = String(req.query.fecha_hasta ?? "").trim();

    const conds = [];
    const params = [];

    if (placa) { conds.push(`v.placa LIKE ?`); params.push(`%${placa}%`); }
    if (celda) { conds.push(`c.codigo LIKE ?`); params.push(`%${celda}%`); }
    if (operador) {
      conds.push(`(ui.nombres LIKE ? OR ui.apellidos LIKE ? OR us.nombres LIKE ? OR us.apellidos LIKE ?)`);
      const like = `%${operador}%`;
      params.push(like, like, like, like);
    }
    if (estado === "adentro") {
      conds.push(`a.fecha_salida IS NULL`);
      conds.push(`a.id_acceso = (SELECT MAX(a2.id_acceso) FROM accesos_vehiculos a2 WHERE a2.id_vehiculo = a.id_vehiculo)`);
    } else if (estado === "fuera") {
      conds.push(`a.fecha_salida IS NOT NULL`);
      conds.push(`a.id_acceso = (SELECT MAX(a2.id_acceso) FROM accesos_vehiculos a2 WHERE a2.id_vehiculo = a.id_vehiculo)`);
    }
    if (fechaDesde) { conds.push(`DATE(a.fecha_ingreso - INTERVAL 5 HOUR) >= ?`); params.push(fechaDesde); }
    if (fechaHasta) { conds.push(`DATE(a.fecha_ingreso - INTERVAL 5 HOUR) <= ?`); params.push(fechaHasta); }

    const where = conds.length ? `WHERE ${conds.join(" AND ")}` : "";

    const [rows] = await pool.query(
      `SELECT a.id_acceso, v.placa, v.propietario_nombre,
              c.codigo AS celda,
              ui.nombres AS operador_ingreso_nombres, ui.apellidos AS operador_ingreso_apellidos,
              us.nombres AS operador_salida_nombres, us.apellidos AS operador_salida_apellidos,
              a.fecha_ingreso, a.fecha_salida
       FROM accesos_vehiculos a
       INNER JOIN vehiculos v ON v.id_vehiculo = a.id_vehiculo
       INNER JOIN celdas c ON c.id_celda = a.id_celda
       INNER JOIN usuarios ui ON ui.id_usuario = a.id_operador_ingreso
       LEFT JOIN usuarios us ON us.id_usuario = a.id_operador_salida
       ${where}
       ORDER BY a.fecha_ingreso DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    );

    const [countRows] = await pool.query(
      `SELECT COUNT(*) AS total
       FROM accesos_vehiculos a
       INNER JOIN vehiculos v ON v.id_vehiculo = a.id_vehiculo
       INNER JOIN celdas c ON c.id_celda = a.id_celda
       INNER JOIN usuarios ui ON ui.id_usuario = a.id_operador_ingreso
       LEFT JOIN usuarios us ON us.id_usuario = a.id_operador_salida
       ${where}`,
      params,
    );

    res.json({ rows, total: Number(countRows?.[0]?.total ?? 0), page, limit });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al consultar el historial de accesos" });
  }
};

export default {
  registrarEntrada,
  registrarSalida,
  listarDentro,
  registrarReubicacion,
  listarAccesos,
  listarDentro,
};
