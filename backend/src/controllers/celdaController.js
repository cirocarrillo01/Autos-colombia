// Gestión de celdas (RF3).
import { responder } from "../utils/responseHelper.js";
import { query, conTransaccion } from "../config/db.js";
import {
  ESTADO_SQL,
  SQL_OCUPADA,
  limiteCeldas,
  liberarMantenimientosExpirados,
} from "../utils/celdas.js";
import { paginar } from "../utils/consultas.js";
import { ErrorNegocio } from "../utils/errores.js";

const SELECT_CELDA = `
  SELECT c.id_celda, c.codigo, c.letra, c.numero, c.id_tipo_vehiculo,
         tv.nombre AS tipo, tv.codigo AS tipo_codigo,
         c.activa, c.en_mantenimiento, c.mantenimiento_hasta, c.fecha_creacion,
         (SELECT a.id_acceso FROM accesos_vehiculos a WHERE a.id_celda = c.id_celda AND a.fecha_salida IS NULL LIMIT 1) AS id_acceso_abierto,
         (SELECT v.placa FROM accesos_vehiculos a INNER JOIN vehiculos v ON v.id_vehiculo = a.id_vehiculo
           WHERE a.id_celda = c.id_celda AND a.fecha_salida IS NULL LIMIT 1) AS placa_ocupante,
         ${ESTADO_SQL} AS estado
  FROM celdas c INNER JOIN tipos_vehiculos tv ON tv.id_tipo_vehiculo = c.id_tipo_vehiculo`;

const FILTROS_ESTADO = {
  inactiva: `c.activa = FALSE`,
  "en mantenimiento": `c.activa = TRUE AND c.en_mantenimiento = TRUE`,
  ocupada: SQL_OCUPADA,
  libre: `c.activa = TRUE AND c.en_mantenimiento = FALSE AND NOT ${SQL_OCUPADA}`,
};

/** Traduce ErrorNegocio -> respuesta; cualquier otro error -> 500 con `mensaje500`. */
const manejar = (res, err, mensaje500) => {
  if (err instanceof ErrorNegocio)
    return responder(res, err.status, err.message);
  console.error(err);
  return responder(res, 500, mensaje500);
};

export const listarCeldas = async (req, res) => {
  try {
    await liberarMantenimientosExpirados();
    const { tipo, bloque, estado } = req.query;
    const { page, limit, offset } = paginar(req.query);
    const conds = [],
      params = [];
    if (tipo === "carro" || tipo === "moto") {
      conds.push(`tv.codigo = ?`);
      params.push(tipo);
    }
    if (bloque) {
      conds.push(`c.letra = ?`);
      params.push(String(bloque).toUpperCase());
    }
    if (estado) {
      const filtro = FILTROS_ESTADO[String(estado).toLowerCase()];
      if (!filtro) return responder(res, 400, "Estado inválido");
      conds.push(filtro);
    }
    const where = conds.length ? `WHERE ${conds.join(" AND ")}` : "";
    const rows = await query(
      `${SELECT_CELDA} ${where} ORDER BY c.letra, c.numero LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    );
    const [{ total }] = await query(
      `SELECT COUNT(*) AS total FROM celdas c INNER JOIN tipos_vehiculos tv ON tv.id_tipo_vehiculo = c.id_tipo_vehiculo ${where}`,
      params,
    );
    res.json({ rows, total: Number(total), page, limit });
  } catch (err) {
    manejar(res, err, "Error al listar las celdas");
  }
};

export const obtenerCeldasDisponibles = async (req, res) => {
  try {
    await liberarMantenimientosExpirados();
    const params = [];
    let sql = `SELECT c.id_celda, c.codigo, c.id_tipo_vehiculo, c.letra, c.numero
               FROM celdas c INNER JOIN tipos_vehiculos tv ON tv.id_tipo_vehiculo = c.id_tipo_vehiculo
               WHERE c.activa = TRUE AND c.en_mantenimiento = FALSE AND NOT ${SQL_OCUPADA}`;
    if (req.query.tipo === "carro" || req.query.tipo === "moto") {
      sql += ` AND tv.codigo = ?`;
      params.push(req.query.tipo);
    }
    res.json(await query(sql + ` ORDER BY c.letra, c.numero`, params));
  } catch (err) {
    manejar(res, err, "Error al obtener las celdas");
  }
};

export const obtenerCelda = async (req, res) => {
  try {
    await liberarMantenimientosExpirados();
    const [celda] = await query(`${SELECT_CELDA} WHERE c.id_celda = ?`, [
      req.params.id,
    ]);
    if (!celda) return responder(res, 404, "Celda no encontrada");
    res.json(celda);
  } catch (err) {
    manejar(res, err, "Error al obtener la celda");
  }
};

export const crearCelda = async (req, res) => {
  try {
    const { letra, numero, id_tipo_vehiculo } = req.body ?? {};
    if (!letra || !numero || !id_tipo_vehiculo) {
      return responder(res, 422, "Letra, numero y tipo de vehiculo son obligatorios");
    }
    const letraNorm = String(letra).trim().toUpperCase();
    if (!/^[A-Z]$/.test(letraNorm))
      return responder(res, 422, "El bloque debe ser una sola letra (A-Z)");
    const n = Number(numero);
    if (!Number.isInteger(n) || n < 1)
      return responder(res, 422, "El numero de celda debe ser un entero mayor o igual a 1");

    const [tipo] = await query(
      `SELECT id_tipo_vehiculo, codigo FROM tipos_vehiculos WHERE id_tipo_vehiculo = ?`,
      [id_tipo_vehiculo],
    );
    if (!tipo)
      return responder(res, 422, "Tipo de vehiculo invalido");

    const max = limiteCeldas(tipo.codigo);
    if (max !== null) {
      const [{ total }] = await query(
        `SELECT COUNT(*) AS total FROM celdas WHERE id_tipo_vehiculo = ?`,
        [tipo.id_tipo_vehiculo],
      );
      if (Number(total) >= max)
        return responder(res, 400, `No se pueden crear más de ${max} celdas para ${tipo.codigo}`);
    }
    const r = await query(
      `INSERT INTO celdas (id_tipo_vehiculo, letra, numero) VALUES (?, ?, ?)`,
      [tipo.id_tipo_vehiculo, letraNorm, n],
    );
    const [celda] = await query(
      `SELECT id_celda, codigo, letra, numero, id_tipo_vehiculo, activa, en_mantenimiento FROM celdas WHERE id_celda = ?`,
      [r.insertId],
    );
    return responder(res, 201, "Celda creada correctamente", { celda });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY")
      return responder(res, 409, "Ya existe una celda con esa letra y numero");
    manejar(res, err, "Error al crear la celda");
  }
};

export const actualizarCelda = async (req, res) => {
  try {
    const idTipo = Number(req.body?.id_tipo_vehiculo);
    if (!Number.isInteger(idTipo) || idTipo < 1)
      return responder(res, 422, "El tipo de vehiculo es obligatorio");

    const [celda] = await query(
      `SELECT c.id_celda, c.id_tipo_vehiculo, ${SQL_OCUPADA} AS ocupada FROM celdas c WHERE c.id_celda = ?`,
      [req.params.id],
    );
    if (!celda) return responder(res, 404, "Celda no encontrada");
    if (Number(celda.ocupada))
      return responder(res, 400, "No se puede cambiar el tipo de una celda ocupada");

    const [tipo] = await query(
      `SELECT id_tipo_vehiculo, codigo FROM tipos_vehiculos WHERE id_tipo_vehiculo = ?`,
      [idTipo],
    );
    if (!tipo)
      return responder(res, 422, "Tipo de vehiculo invalido");

    if (celda.id_tipo_vehiculo !== idTipo) {
      const max = limiteCeldas(tipo.codigo);
      const [{ total }] = await query(
        `SELECT COUNT(*) AS total FROM celdas WHERE id_tipo_vehiculo = ?`,
        [idTipo],
      );
      if (max !== null && Number(total) >= max) {
        return res
          .status(400)
          .json({
            error: `No se puede cambiar el tipo: se ha alcanzado la capacidad maxima de ${max} celdas para ${tipo.codigo}s.`,
          });
      }
    }
    await query(`UPDATE celdas SET id_tipo_vehiculo = ? WHERE id_celda = ?`, [
      idTipo,
      req.params.id,
    ]);
    res.json({ mensaje: "Tipo de celda actualizado correctamente" });
  } catch (err) {
    manejar(res, err, "Error al actualizar la celda");
  }
};

/**
 * Intercambia el tipo de dos celdas libres.
 * BUG CRÍTICO corregido: antes se usaba query("START TRANSACTION") sobre el pool; cada query
 * puede salir por una conexión distinta, así que no había transacción y un fallo a mitad dejaba
 * dos celdas del mismo tipo. Ahora es una transacción real con FOR UPDATE (también evita carreras con un ingreso).
 */
export const intercambiarTipoCelda = async (req, res) => {
  const a = Number(req.body?.id_celda_1),
    b = Number(req.body?.id_celda_2);
  if (!Number.isInteger(a) || !Number.isInteger(b) || a < 1 || b < 1) {
    return res
      .status(422)
      .json({ error: "Ambos IDs de celda son obligatorios" });
  }
  if (a === b)
    return res.status(422).json({ error: "Debe elegir dos celdas distintas" });
  try {
    await conTransaccion(async (conn) => {
      const [filas] = await conn.query(
        `SELECT c.id_celda, c.id_tipo_vehiculo, ${SQL_OCUPADA} AS ocupada FROM celdas c WHERE c.id_celda IN (?, ?) FOR UPDATE`,
        [a, b],
      );
      if (filas.length !== 2)
        throw new ErrorNegocio(404, "Una o ambas celdas no existen");
      const [c1, c2] = [
        filas.find((f) => f.id_celda === a),
        filas.find((f) => f.id_celda === b),
      ];
      if (Number(c1.ocupada) || Number(c2.ocupada))
        throw new ErrorNegocio(
          400,
          "No se pueden intercambiar tipos de celdas ocupadas",
        );
      if (c1.id_tipo_vehiculo === c2.id_tipo_vehiculo)
        throw new ErrorNegocio(400, "Las celdas ya son del mismo tipo");
      await conn.query(
        `UPDATE celdas SET id_tipo_vehiculo = ? WHERE id_celda = ?`,
        [c2.id_tipo_vehiculo, c1.id_celda],
      );
      await conn.query(
        `UPDATE celdas SET id_tipo_vehiculo = ? WHERE id_celda = ?`,
        [c1.id_tipo_vehiculo, c2.id_celda],
      );
    });
    res.json({ mensaje: "Intercambio de tipos realizado correctamente" });
  } catch (err) {
    manejar(res, err, "Error al realizar el intercambio");
  }
};

export const cambiarEstadoCelda = async (req, res) => {
  try {
    await liberarMantenimientosExpirados();
    const { activa, en_mantenimiento } = req.body ?? {};
    const [celda] = await query(
      `SELECT c.id_celda, c.activa, c.en_mantenimiento, ${SQL_OCUPADA} AS ocupada FROM celdas c WHERE c.id_celda = ?`,
      [req.params.id],
    );
    if (!celda) return res.status(404).json({ error: "Celda no encontrada" });

    const cambios = [],
      params = [];
    if (typeof activa === "boolean") {
      // Nueva validación de aforo al activar una celda desactivada
      if (activa === true && celda.activa === 0) {
        const [tipo] = await query(
          `SELECT tv.codigo, tv.id_tipo_vehiculo FROM tipos_vehiculos tv
           INNER JOIN celdas c ON c.id_tipo_vehiculo = tv.id_tipo_vehiculo
           WHERE c.id_celda = ?`,
          [req.params.id]
        );
        const max = limiteCeldas(tipo.codigo);
        if (max !== null) {
          const [{ total }] = await query(
            `SELECT COUNT(*) AS total FROM celdas WHERE id_tipo_vehiculo = ? AND activa = TRUE`,
            [tipo.id_tipo_vehiculo]
          );
          if (Number(total) >= max) {
            return responder(res, 400, `No es posible habilitar esta celda: se ha alcanzado la capacidad máxima de ${max} celdas activas para ${tipo.codigo}s.`);
          }
        }
      }
      cambios.push(`activa = ?`);
      params.push(activa);
    }
    if (typeof en_mantenimiento === "boolean") {
      cambios.push(`en_mantenimiento = ?`);
      params.push(en_mantenimiento);
      if (en_mantenimiento) {
        const minutos = Number(
          req.body.minutos_mantenimiento ?? req.body.duracion_minutos ?? 60,
        );
        if (!Number.isFinite(minutos) || minutos < 1) {
          return responder(res, 422, "La duracion del mantenimiento debe ser mayor a 0 minutos");
        }
        cambios.push(
          `mantenimiento_hasta = DATE_ADD(UTC_TIMESTAMP(), INTERVAL ? MINUTE)`,
        );
        params.push(minutos);
      } else {
        cambios.push(`mantenimiento_hasta = NULL`);
      }
    }
    if (!cambios.length)
      return responder(res, 422, "Debe indicar activa y/o en_mantenimiento");

    const vaInactiva = typeof activa === "boolean" ? !activa : !celda.activa;
    const vaMant =
      typeof en_mantenimiento === "boolean"
        ? en_mantenimiento
        : !!celda.en_mantenimiento;
    if ((vaInactiva || vaMant) && Number(celda.ocupada)) {
      return res
        .status(400)
        .json({
          error:
            "No se puede deshabilitar una celda ocupada. Registre la salida primero.",
        });
    }
    await query(`UPDATE celdas SET ${cambios.join(", ")} WHERE id_celda = ?`, [
      ...params,
      req.params.id,
    ]);
    res.json({ mensaje: "Estado de la celda actualizado correctamente" });
  } catch (err) {
    manejar(res, err, "Error al actualizar el estado de la celda");
  }
};

export const eliminarCelda = async (req, res) => {
  try {
    const id = req.params.id;
    const [celda] = await query(
      `SELECT c.id_celda, ${SQL_OCUPADA} AS ocupada,
              EXISTS (SELECT 1 FROM accesos_vehiculos a WHERE a.id_celda = c.id_celda) AS historial
       FROM celdas c WHERE c.id_celda = ?`,
      [id],
    );
    if (!celda) return res.status(404).json({ error: "Celda no encontrada" });
    if (Number(celda.ocupada))
      return res
        .status(409)
        .json({ error: "Acción bloqueada: la celda está actualmente ocupada por un vehículo." });
    if (Number(celda.historial))
      return res
        .status(409)
        .json({
          error: "Acción bloqueada: existen registros históricos de ingresos y salidas vinculados a esta celda.",
        });
    await query(`DELETE FROM celdas WHERE id_celda = ?`, [id]);
    res.json({ mensaje: "Celda eliminada correctamente" });
  } catch (err) {
    if (err.code === "ER_ROW_IS_REFERENCED_2")
      return res
        .status(400)
        .json({
          error:
            "No se puede eliminar la celda porque tiene registros asociados",
        });
    manejar(res, err, "Error al eliminar la celda");
  }
};

/** Resumen por tipo. Una sola consulta (antes dos con el CASE repetido 10 veces) y totales sumados en JS. */
export const resumenCeldas = async (_req, res) => {
  try {
    await liberarMantenimientosExpirados();
    const filas = await query(
      `SELECT tipo, COUNT(*) AS total,
              SUM(estado = 'libre') AS libres, SUM(estado = 'ocupada') AS ocupadas,
              SUM(estado IN ('inactiva','en mantenimiento')) AS no_disponibles
       FROM (SELECT tv.codigo AS tipo, ${ESTADO_SQL} AS estado
             FROM celdas c INNER JOIN tipos_vehiculos tv ON tv.id_tipo_vehiculo = c.id_tipo_vehiculo) t
       GROUP BY tipo ORDER BY tipo`,
    );
    const porTipo = filas.map((f) => ({
      tipo: f.tipo,
      total: Number(f.total),
      libres: Number(f.libres),
      asignadas: 0,
      ocupadas: Number(f.ocupadas),
      no_disponibles: Number(f.no_disponibles),
    }));
    const suma = (k) => porTipo.reduce((s, f) => s + f[k], 0);
    res.json({
      porTipo,
      totales: {
        total: suma("total"),
        libres: suma("libres"),
        asignadas: 0,
        ocupadas: suma("ocupadas"),
        no_disponibles: suma("no_disponibles"),
      },
    });
  } catch (err) {
    manejar(res, err, "Error al generar el resumen de celdas");
  }
};

export const celdasPorBloque = async (_req, res) => {
  try {
    await liberarMantenimientosExpirados();
    const filas = await query(`${SELECT_CELDA} ORDER BY c.letra, c.numero`);
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
    manejar(res, err, "Error al obtener las celdas por bloque");
  }
};

export const listarTipos = async (_req, res) => {
  try {
    res.json(
      await query(
        `SELECT id_tipo_vehiculo, codigo, nombre FROM tipos_vehiculos WHERE activo = TRUE ORDER BY codigo`,
      ),
    );
  } catch (err) {
    manejar(res, err, "Error al obtener los tipos de vehiculo");
  }
};

export default {
  listarCeldas,
  obtenerCeldasDisponibles,
  obtenerCelda,
  crearCelda,
  actualizarCelda,
  intercambiarTipoCelda,
  cambiarEstadoCelda,
  eliminarCelda,
  resumenCeldas,
  celdasPorBloque,
  listarTipos,
};
