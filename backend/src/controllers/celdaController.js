//backend/src/controllers/celdaController.js
// Gestión completa de celdas (RF3).
//   GET    /api/celdas                 listar con filtros (tipo, bloque, estado) y paginación
//   GET    /api/celdas/disponibles     celdas libres por tipo (para ingreso/salida)
//   GET    /api/celdas/:id             obtener una celda
//   POST   /api/celdas                 crear celda (solo admin)
//   PUT    /api/celdas/:id             editar tipo de celda si no tiene vehículo asignado (RF3.8)
//   PATCH  /api/celdas/:id/estado      activar/inactivar / mantenimiento (RF3.7)
//   GET    /api/celdas/resumen         resumen por tipo: total, libres, asignadas, ocupadas, no disponibles (RF3.9)
//   GET    /api/celdas/bloques         celdas organizadas por bloques (RF3.10)
//   GET    /api/celdas/tipos           tipos de vehículo para el formulario de crear celda

import { query } from "../config/db.js";

/**
 * Libera las celdas cuyo tiempo de mantenimiento ha expirado basándose en UTC.
 * @returns {Promise<void>}
 */
async function liberarMantenimientosExpirados() {
  await query(
    `UPDATE celdas
     SET en_mantenimiento = FALSE, mantenimiento_hasta = NULL
     WHERE en_mantenimiento = TRUE
       AND mantenimiento_hasta IS NOT NULL
       AND mantenimiento_hasta <= UTC_TIMESTAMP()`,
  );
}

/** 
 * Fragmento SQL para determinar el estado actual de una celda.
 * @type {string}
 */
const ESTADO_SQL = `
  CASE
    WHEN c.activa = FALSE THEN 'inactiva'
    WHEN c.en_mantenimiento = TRUE AND (c.mantenimiento_hasta IS NULL OR c.mantenimiento_hasta > UTC_TIMESTAMP()) THEN 'en mantenimiento'
    WHEN EXISTS (
      SELECT 1 FROM accesos_vehiculos a
      WHERE a.id_celda = c.id_celda AND a.fecha_salida IS NULL
    ) THEN 'ocupada'
    ELSE 'libre'
  END
`;

/**
 * GET /api/celdas - Listar celdas con filtros y paginación.
 * @param {import('express').Request} req - Query params: tipo, bloque, estado, page, limit.
 * @param {import('express').Response} res
 * @returns {Promise<void>}
 */
export const listarCeldas = async (req, res) => {
  try {
    await liberarMantenimientosExpirados();
    const { tipo, bloque, estado, page = 1, limit = 20 } = req.query;
    const p = Math.max(Number.parseInt(page, 10) || 1, 1);
    const l = Math.max(Math.min(Number.parseInt(limit, 10) || 20, 100), 1);
    const offset = (p - 1) * l;

    const conds = [];
    const params = [];

    if (tipo === "carro" || tipo === "moto") {
      conds.push(
        `c.id_tipo_vehiculo = (SELECT id_tipo_vehiculo FROM tipos_vehiculos WHERE codigo = ? LIMIT 1)`,
      );
      params.push(tipo);
    }
    if (bloque) {
      conds.push(`c.letra = ?`);
      params.push(String(bloque).toUpperCase());
    }

    if (estado) {
      const e = String(estado).toLowerCase();
      if (e === "inactiva") {
        conds.push(`c.activa = FALSE`);
      } else if (e === "en mantenimiento") {
        conds.push(`c.en_mantenimiento = TRUE AND c.activa = TRUE`);
      } else if (e === "ocupada") {
        conds.push(
          `EXISTS (SELECT 1 FROM accesos_vehiculos a WHERE a.id_celda = c.id_celda AND a.fecha_salida IS NULL)`,
        );
      } else if (e === "asignada") {
        conds.push(`1 = 0`);
      } else if (e === "libre") {
        conds.push(`c.activa = TRUE AND c.en_mantenimiento = FALSE
          AND NOT EXISTS (SELECT 1 FROM accesos_vehiculos a WHERE a.id_celda = c.id_celda AND a.fecha_salida IS NULL)`);
      } else {
        return res.status(400).json({ error: "Estado inválido" });
      }
    }

    const where = conds.length ? `WHERE ${conds.join(" AND ")}` : "";

    const rows = await query(
      `SELECT c.id_celda, c.codigo, c.letra, c.numero, c.id_tipo_vehiculo,
              tv.nombre AS tipo, tv.codigo AS tipo_codigo,
              c.activa, c.en_mantenimiento, c.fecha_creacion,
              NULL AS placa_asignada,
              (SELECT v.placa FROM accesos_vehiculos a
                INNER JOIN vehiculos v ON v.id_vehiculo = a.id_vehiculo
                WHERE a.id_celda = c.id_celda AND a.fecha_salida IS NULL
                LIMIT 1) AS placa_ocupante,
              ${ESTADO_SQL} AS estado
       FROM celdas c
       INNER JOIN tipos_vehiculos tv ON tv.id_tipo_vehiculo = c.id_tipo_vehiculo
       ${where}
       ORDER BY c.letra, c.numero
       LIMIT ? OFFSET ?`,
      [...params, l, offset],
    );

    const countRows = await query(
      `SELECT COUNT(*) AS total FROM celdas c ${where}`,
      params,
    );

    res.json({
      rows,
      total: Number(countRows[0]?.total ?? 0),
      page: p,
      limit: l,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al listar las celdas" });
  }
};

/**
 * GET /api/celdas/disponibles - Celdas libres, opcionalmente por tipo.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
export const obtenerCeldasDisponibles = async (req, res) => {
  try {
    await liberarMantenimientosExpirados();
    const { tipo } = req.query;

    let sql = `
      SELECT c.id_celda, c.codigo, c.id_tipo_vehiculo, c.letra, c.numero
      FROM celdas c
      WHERE c.activa = TRUE
        AND c.en_mantenimiento = FALSE
        AND NOT EXISTS (
          SELECT 1 FROM accesos_vehiculos a
          WHERE a.id_celda = c.id_celda AND a.fecha_salida IS NULL
        )
    `;
    const params = [];

    if (tipo === "carro" || tipo === "moto") {
      sql += ` AND c.id_tipo_vehiculo = (
        SELECT id_tipo_vehiculo FROM tipos_vehiculos WHERE codigo = ? LIMIT 1
      )`;
      params.push(tipo);
    }

    sql += " ORDER BY c.letra, c.numero";

    res.json(await query(sql, params));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener las celdas" });
  }
};

/**
 * GET /api/celdas/:id - Obtener una celda por id.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
export const obtenerCelda = async (req, res) => {
  try {
    await liberarMantenimientosExpirados();
    const filas = await query(
      `SELECT c.id_celda, c.codigo, c.letra, c.numero, c.id_tipo_vehiculo,
              tv.nombre AS tipo, tv.codigo AS tipo_codigo,
              c.activa, c.en_mantenimiento, c.fecha_creacion,
              NULL AS placa_asignada,
              (SELECT v.placa FROM accesos_vehiculos a
                INNER JOIN vehiculos v ON v.id_vehiculo = a.id_vehiculo
                WHERE a.id_celda = c.id_celda AND a.fecha_salida IS NULL
                LIMIT 1) AS placa_ocupante,
              ${ESTADO_SQL} AS estado
       FROM celdas c
       INNER JOIN tipos_vehiculos tv ON tv.id_tipo_vehiculo = c.id_tipo_vehiculo
       WHERE c.id_celda = ?`,
      [req.params.id],
    );
    if (filas.length === 0) {
      return res.status(404).json({ error: "Celda no encontrada" });
    }
    res.json(filas[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener la celda" });
  }
};

/**
 * POST /api/celdas - Crear una celda.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
export const crearCelda = async (req, res) => {
  try {
    const { letra, numero, id_tipo_vehiculo } = req.body ?? {};
    if (!letra || !numero || !id_tipo_vehiculo) {
      return res
        .status(400)
        .json({ error: "Letra, numero y tipo de vehiculo son obligatorios" });
    }
    if (!/^[A-Za-z]$/.test(String(letra))) {
      return res
        .status(400)
        .json({ error: "El bloque debe ser una sola letra (A-Z)" });
    }
    const n = Number.parseInt(numero, 10);
    if (!Number.isFinite(n) || n < 1) {
      return res
        .status(400)
        .json({ error: "El numero de celda debe ser mayor o igual a 1" });
    }

    const tipos = await query(
      `SELECT id_tipo_vehiculo FROM tipos_vehiculos WHERE id_tipo_vehiculo = ? LIMIT 1`,
      [id_tipo_vehiculo],
    );
    if (tipos.length === 0) {
      return res.status(400).json({ error: "Tipo de vehiculo invalido" });
    }

    const existentes = await query(
      `SELECT id_celda FROM celdas WHERE letra = ? AND numero = ? LIMIT 1`,
      [String(letra).toUpperCase(), n],
    );
    if (existentes.length > 0) {
      return res
        .status(409)
        .json({ error: "Ya existe una celda con esa letra y numero" });
    }

    const [tipoInfo] = await query(
      `SELECT codigo FROM tipos_vehiculos WHERE id_tipo_vehiculo = ? LIMIT 1`,
      [id_tipo_vehiculo],
    );
    const maxPorTipo =
      tipoInfo?.codigo === "carro"
        ? 70
        : tipoInfo?.codigo === "moto"
          ? 10
          : null;
    if (maxPorTipo !== null) {
      const [countRows] = await query(
        `SELECT COUNT(*) AS total FROM celdas WHERE id_tipo_vehiculo = ?`,
        [id_tipo_vehiculo],
      );
      const totalActual = Number(
        (Array.isArray(countRows) ? countRows[0] : countRows)?.total ?? 0,
      );
      if (totalActual >= maxPorTipo) {
        return res.status(400).json({
          error: `No se pueden crear más de ${maxPorTipo} celdas para ${tipoInfo.codigo}`,
        });
      }
    }

    const r = await query(
      `INSERT INTO celdas (id_tipo_vehiculo, letra, numero) VALUES (?, ?, ?)`,
      [id_tipo_vehiculo, String(letra).toUpperCase(), n],
    );
    const filas = await query(
      `SELECT id_celda, codigo, letra, numero, id_tipo_vehiculo, activa, en_mantenimiento
       FROM celdas WHERE id_celda = ?`,
      [r.insertId],
    );
    res.status(201).json(filas[0]);
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      return res
        .status(409)
        .json({ error: "Ya existe una celda con esa letra y numero" });
    }
    console.error(err);
    res.status(500).json({ error: "Error al crear la celda" });
  }
};

/**
 * PUT /api/celdas/:id - Editar el tipo de una celda.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
export const actualizarCelda = async (req, res) => {
  try {
    const { id_tipo_vehiculo } = req.body ?? {};
    if (!id_tipo_vehiculo) {
      return res
        .status(400)
        .json({ error: "El tipo de vehiculo es obligatorio" });
    }

    const [celda] = await query(
      `SELECT c.id_celda, c.id_tipo_vehiculo,
              (SELECT COUNT(*) FROM accesos_vehiculos m WHERE m.id_celda = c.id_celda AND m.fecha_salida IS NULL) AS ocupada
       FROM celdas c WHERE c.id_celda = ?`,
      [req.params.id],
    );
    if (!celda) {
      return res.status(404).json({ error: "Celda no encontrada" });
    }

    if (celda.ocupada > 0) {
      return res.status(400).json({
        error: "No se puede cambiar el tipo de una celda ocupada",
      });
    }

    const tipos = await query(
      `SELECT id_tipo_vehiculo FROM tipos_vehiculos WHERE id_tipo_vehiculo = ? LIMIT 1`,
      [id_tipo_vehiculo],
    );
    if (tipos.length === 0) {
      return res.status(400).json({ error: "Tipo de vehiculo invalido" });
    }

    if (celda.id_tipo_vehiculo !== id_tipo_vehiculo) {
      const limiteMaximo = id_tipo_vehiculo === "carro" ? 70 : 10;
      const [{ total }] = await query(
        `SELECT COUNT(*) AS total FROM celdas WHERE id_tipo_vehiculo = ?`,
        [id_tipo_vehiculo],
      );
      if (total >= limiteMaximo) {
        return res.status(400).json({
          error: `No se puede cambiar el tipo: se ha alcanzado la capacidad maxima de ${limiteMaximo} celdas para ${id_tipo_vehiculo}s.`,
        });
      }
    }

    await query(`UPDATE celdas SET id_tipo_vehiculo = ? WHERE id_celda = ?`, [
      id_tipo_vehiculo,
      req.params.id,
    ]);
    res.json({ mensaje: "Tipo de celda actualizado correctamente" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al actualizar la celda" });
  }
};

/**
 * PATCH /api/celdas/:id/estado - Activar/inactivar o marcar en mantenimiento.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
export const cambiarEstadoCelda = async (req, res) => {
  try {
    await liberarMantenimientosExpirados();
    const { activa, en_mantenimiento } = req.body ?? {};
    const [celda] = await query(
      `SELECT c.id_celda, c.codigo, c.activa, c.en_mantenimiento,
              (SELECT COUNT(*) FROM accesos_vehiculos a WHERE a.id_celda = c.id_celda AND a.fecha_salida IS NULL) AS ocupada
       FROM celdas c WHERE c.id_celda = ?`,
      [req.params.id],
    );
    if (!celda) {
      return res.status(404).json({ error: "Celda no encontrada" });
    }

    const cambios = [];
    const params = [];
    if (typeof activa === "boolean") {
      cambios.push(`activa = ?`);
      params.push(activa);
    }
    if (typeof en_mantenimiento === "boolean") {
      cambios.push(`en_mantenimiento = ?`);
      params.push(en_mantenimiento);
      if (en_mantenimiento) {
        const minutos = Number(
          req.body?.minutos_mantenimiento ?? req.body?.duracion_minutos ?? 60,
        );
        if (!Number.isFinite(minutos) || minutos < 1) {
          return res.status(400).json({
            error: "La duracion del mantenimiento debe ser mayor a 0 minutos",
          });
        }
        cambios.push(
          `mantenimiento_hasta = DATE_ADD(UTC_TIMESTAMP(), INTERVAL ? MINUTE)`,
        );
        params.push(minutos);
      } else {
        cambios.push(`mantenimiento_hasta = NULL`);
      }
    }
    if (cambios.length === 0) {
      return res
        .status(400)
        .json({ error: "Debe indicar activa y/o en_mantenimiento" });
    }

    const vaInactiva = typeof activa === "boolean" ? !activa : !celda.activa;
    const vaMantenimiento =
      typeof en_mantenimiento === "boolean"
        ? en_mantenimiento
        : celda.en_mantenimiento;
    if (vaInactiva || vaMantenimiento) {
      const [ocupada] = await query(
        `SELECT id_acceso FROM accesos_vehiculos WHERE id_celda = ? AND fecha_salida IS NULL LIMIT 1`,
        [req.params.id],
      );
      if (ocupada) {
        return res.status(400).json({
          error:
            "No se puede deshabilitar una celda ocupada. Registre la salida primero.",
        });
      }
    }

    params.push(req.params.id);
    await query(
      `UPDATE celdas SET ${cambios.join(", ")} WHERE id_celda = ?`,
      params,
    );
    res.json({ mensaje: "Estado de la celda actualizado correctamente" });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ error: "Error al actualizar el estado de la celda" });
  }
};

/**
 * DELETE /api/celdas/:id - Eliminar una celda.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
export const eliminarCelda = async (req, res) => {
  try {
    const id = req.params.id;
    const [celda] = await query(
      `SELECT id_celda, codigo FROM celdas WHERE id_celda = ?`,
      [id],
    );
    if (!celda) return res.status(404).json({ error: "Celda no encontrada" });

    const [ocupada] = await query(
      `SELECT id_acceso FROM accesos_vehiculos WHERE id_celda = ? AND fecha_salida IS NULL LIMIT 1`,
      [id],
    );
    if (ocupada) {
      return res
        .status(400)
        .json({ error: "No se puede eliminar una celda ocupada" });
    }

    const [historial] = await query(
      `SELECT id_acceso FROM accesos_vehiculos WHERE id_celda = ? LIMIT 1`,
      [id],
    );
    if (historial) {
      return res.status(400).json({
        error: "No se puede eliminar una celda con historial de accesos",
      });
    }

    await query(`DELETE FROM celdas WHERE id_celda = ?`, [id]);
    res.json({ mensaje: "Celda eliminada correctamente" });
  } catch (err) {
    if (err.code === "ER_ROW_IS_REFERENCED_2") {
      return res.status(400).json({
        error: "No se puede eliminar la celda porque tiene registros asociados",
      });
    }
    console.error(err);
    res.status(500).json({ error: "Error al eliminar la celda" });
  }
};

/**
 * GET /api/celdas/resumen - Resumen de celdas por tipo.
 * @param {import('express').Request} _req
 * @param {import('express').Response} res
 */
export const resumenCeldas = async (_req, res) => {
  try {
    await liberarMantenimientosExpirados();
    const filas = await query(
      `SELECT
         tv.codigo AS tipo,
         COUNT(*) AS total,
         SUM(CASE WHEN ${ESTADO_SQL} = 'libre' THEN 1 ELSE 0 END) AS libres,
         SUM(CASE WHEN ${ESTADO_SQL} = 'asignada' THEN 1 ELSE 0 END) AS asignadas,
         SUM(CASE WHEN ${ESTADO_SQL} = 'ocupada' THEN 1 ELSE 0 END) AS ocupadas,
         SUM(CASE WHEN ${ESTADO_SQL} IN ('inactiva','en mantenimiento') THEN 1 ELSE 0 END) AS no_disponibles
       FROM celdas c
       INNER JOIN tipos_vehiculos tv ON tv.id_tipo_vehiculo = c.id_tipo_vehiculo
       GROUP BY tv.codigo
       ORDER BY tv.codigo`,
    );

    const [totalesRows] = await query(
      `SELECT
         COUNT(*) AS total,
         SUM(CASE WHEN ${ESTADO_SQL} = 'libre' THEN 1 ELSE 0 END) AS libres,
         SUM(CASE WHEN ${ESTADO_SQL} = 'asignada' THEN 1 ELSE 0 END) AS asignadas,
         SUM(CASE WHEN ${ESTADO_SQL} = 'ocupada' THEN 1 ELSE 0 END) AS ocupadas,
         SUM(CASE WHEN ${ESTADO_SQL} IN ('inactiva','en mantenimiento') THEN 1 ELSE 0 END) AS no_disponibles
       FROM celdas c`,
    );
    const totales = totalesRows;

    res.json({ porTipo: filas, totales });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al generar el resumen de celdas" });
  }
};

/**
 * GET /api/celdas/bloques - Celdas organizadas por bloques para vista visual.
 * @param {import('express').Request} _req
 * @param {import('express').Response} res
 */
export const celdasPorBloque = async (_req, res) => {
  try {
    await liberarMantenimientosExpirados();
    const filas = await query(
      `SELECT c.id_celda, c.codigo, c.letra, c.numero, c.id_tipo_vehiculo,
              tv.nombre AS tipo, tv.codigo AS tipo_codigo,
              c.activa, c.en_mantenimiento, ${ESTADO_SQL} AS estado,
              (SELECT v.placa FROM accesos_vehiculos a
                 INNER JOIN vehiculos v ON v.id_vehiculo = a.id_vehiculo
                 WHERE a.id_celda = c.id_celda AND a.fecha_salida IS NULL
                 LIMIT 1) AS placa_ocupante
       FROM celdas c
       INNER JOIN tipos_vehiculos tv ON tv.id_tipo_vehiculo = c.id_tipo_vehiculo
       ORDER BY c.letra, c.numero`,
    );
    const porBloque = new Map();
    for (const f of filas) {
      if (!porBloque.has(f.letra)) porBloque.set(f.letra, []);
      porBloque.get(f.letra).push({
        id_celda: f.id_celda,
        codigo: f.codigo,
        numero: f.numero,
        id_tipo_vehiculo: f.id_tipo_vehiculo,
        tipo: f.tipo,
        tipo_codigo: f.tipo_codigo,
        placa_ocupante: f.placa_ocupante ?? null,
        estado: f.estado,
        activa: !!f.activa,
        en_mantenimiento: !!f.en_mantenimiento,
      });
    }
    res.json([...porBloque].map(([bloque, celdas]) => ({ bloque, celdas })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener las celdas por bloque" });
  }
};

/** 
 * GET /api/celdas/tipos - Tipos de vehiculo (para el formulario de crear celda). 
 * @param {import('express').Request} _req
 * @param {import('express').Response} res
 */
export const listarTipos = async (_req, res) => {
  try {
    res.json(
      await query(
        `SELECT id_tipo_vehiculo, codigo, nombre FROM tipos_vehiculos WHERE activo = TRUE ORDER BY codigo`,
      ),
    );
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener los tipos de vehiculo" });
  }
};

export default {
  listarCeldas,
  obtenerCeldasDisponibles,
  obtenerCelda,
  crearCelda,
  actualizarCelda,
  cambiarEstadoCelda,
  eliminarCelda,
  resumenCeldas,
  celdasPorBloque,
  listarTipos,
};