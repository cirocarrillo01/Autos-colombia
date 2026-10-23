// backend/src/controllers/celdaController.js
// GET /api/celdas?tipo=carro|moto
// Una celda esta disponible si esta activa, no esta en mantenimiento y no tiene
// un acceso abierto (accesos_vehiculos.fecha_salida IS NULL).
// Retorna [{ id_celda, codigo, id_tipo_vehiculo, letra, numero }].

import { query } from "../config/db.js";

export const obtenerCeldasDisponibles = async (req, res) => {
  try {
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
