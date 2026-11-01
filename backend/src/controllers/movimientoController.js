// backend/src/controllers/movimientoController.js
// POST  /api/movimientos/entrada          body: { placa, id_celda }
// POST  /api/movimientos/salida           body: { placa }
// PATCH /api/movimientos/:id_acceso/celda body: { id_celda }
//
// Todas las rutas requieren autenticación JWT (ver routes/movimientos.js).
// La disponibilidad de una celda no se guarda en la tabla celdas: está
// ocupada si existe un acceso con fecha_salida IS NULL. Los índices únicos
// uq_acceso_vehiculo_dentro y uq_acceso_celda_ocupada impiden duplicados
// incluso con peticiones simultáneas.

import { pool } from "../config/db.js";
import { validarPlaca } from "../validators/placa.js";

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

// #16: puerta activa se resuelve desde la BD, no hardcodeada a id=1.
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

// #15: el operador viene SIEMPRE de req.user (middleware autenticar).
// Antes existía un fallback al "primer usuario de la tabla" que podía
// atribuir movimientos a un admin o a un usuario inactivo.
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
      /* conexión ya cerrada */
    }
    if (err instanceof ErrorNegocio) {
      return res.status(err.status).json({ error: err.message });
    }
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        error: "El vehículo ya está adentro o la celda ya fue ocupada",
      });
    }
    console.error("Error en movimiento:", err);
    res.status(500).json({ error: "Error interno al registrar el movimiento" });
  } finally {
    conn.release();
  }
}

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

// ---------------------------------------------------------------------------
// ENTRADA
// ---------------------------------------------------------------------------
export const registrarEntrada = (req, res) => {
  const { placa, id_celda } = req.body ?? {};
  if (!placa || !id_celda) {
    return res.status(400).json({ error: "Placa y celda requeridos" });
  }

  return ejecutar(res, async (conn) => {
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
      throw new ErrorNegocio(400, "El vehículo ya está adentro");

    const [mensualidad] = await conn.query(
      `SELECT (fecha_fin >= DATE(UTC_TIMESTAMP() - INTERVAL 5 HOUR)) AS vigente
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

    const [ocupada] = await conn.query(
      `SELECT id_acceso FROM accesos_vehiculos
       WHERE id_celda = ? AND fecha_salida IS NULL LIMIT 1`,
      [c.id_celda],
    );
    if (ocupada.length > 0)
      throw new ErrorNegocio(400, "La celda ya está ocupada");

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
        ...fechaHoraActual(),
      },
    };
  });
};

// ---------------------------------------------------------------------------
// SALIDA
// ---------------------------------------------------------------------------
export const registrarSalida = (req, res) => {
  const { placa } = req.body ?? {};
  if (!placa) return res.status(400).json({ error: "Placa requerida" });

  return ejecutar(res, async (conn) => {
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
      throw new ErrorNegocio(404, "Vehículo no encontrado");
    const v = vehiculos[0];

    if (!validarPlaca(v.placa, v.tipo_codigo).valida) {
      throw new ErrorNegocio(
        400,
        `La placa ${v.placa} no tiene el formato válido para ${v.tipo}`,
      );
    }

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
        ...fechaHoraActual(),
      },
    };
  });
};

// ---------------------------------------------------------------------------
// REUBICACIÓN
// ---------------------------------------------------------------------------
export const registrarReubicacion = async (req, res) => {
  const { id_acceso } = req.params ?? {};
  const { id_celda } = req.body ?? {};
  if (!id_acceso) return res.status(400).json({ error: "Acceso requerido" });
  if (!id_celda) return res.status(400).json({ error: "Celda requerida" });

  return ejecutar(res, async (conn) => {
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
       LIMIT 1`,
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
      throw new ErrorNegocio(400, "La celda ya está ocupada");

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
  });
};

// ---------------------------------------------------------------------------
// HISTORIAL
// ---------------------------------------------------------------------------
export const listarAccesos = async (req, res) => {
  try {
    const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.max(
      Math.min(Number.parseInt(req.query.limit, 10) || 20, 100),
      1,
    );
    const offset = (page - 1) * limit;

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
    const fechaDesde = String(req.query.fecha_desde ?? "").trim();
    const fechaHasta = String(req.query.fecha_hasta ?? "").trim();

    const conds = [];
    const params = [];

    if (placa) {
      conds.push(`v.placa LIKE ?`);
      params.push(`%${placa}%`);
    }
    if (celda) {
      conds.push(`c.codigo LIKE ?`);
      params.push(`%${celda}%`);
    }
    if (operador) {
      conds.push(
        `(ui.nombres LIKE ? OR ui.apellidos LIKE ? OR us.nombres LIKE ? OR us.apellidos LIKE ?)`,
      );
      const like = `%${operador}%`;
      params.push(like, like, like, like);
    }
    if (estado === "adentro") {
      conds.push(`a.fecha_salida IS NULL`);
      conds.push(
        `a.id_acceso = (SELECT MAX(a2.id_acceso) FROM accesos_vehiculos a2 WHERE a2.id_vehiculo = a.id_vehiculo)`,
      );
    } else if (estado === "fuera") {
      conds.push(`a.fecha_salida IS NOT NULL`);
      conds.push(
        `a.id_acceso = (SELECT MAX(a2.id_acceso) FROM accesos_vehiculos a2 WHERE a2.id_vehiculo = a.id_vehiculo)`,
      );
    }
    if (fechaDesde) {
      conds.push(`DATE(a.fecha_ingreso - INTERVAL 5 HOUR) >= ?`);
      params.push(fechaDesde);
    }
    if (fechaHasta) {
      conds.push(`DATE(a.fecha_ingreso - INTERVAL 5 HOUR) <= ?`);
      params.push(fechaHasta);
    }

    const where = conds.length ? `WHERE ${conds.join(" AND ")}` : "";

    const [rows] = await pool.query(
      `SELECT a.id_acceso, v.placa, v.propietario_nombre,
              c.codigo AS celda,
              ui.nombres AS operador_ingreso_nombres,
              ui.apellidos AS operador_ingreso_apellidos,
              us.nombres AS operador_salida_nombres,
              us.apellidos AS operador_salida_apellidos,
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

    const total = countRows?.[0]?.total ?? 0;

    res.json({ rows, total: Number(total), page, limit });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ error: "Error al consultar el historial de accesos" });
  }
};
