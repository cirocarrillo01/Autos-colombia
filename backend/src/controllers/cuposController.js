// backend/src/controllers/cuposController.js
import { query } from "../config/db.js";
import { responder } from "../utils/responseHelper.js";
import { MSG } from "../utils/messages.js";

const SQL_FALLBACK = `
  SELECT tv.codigo AS tipo_vehiculo,
         (COUNT(c.id_celda) - COALESCE(activos.ocupadas, 0)) AS plazas_disponibles
  FROM tipos_vehiculos tv
  LEFT JOIN celdas c ON tv.id_tipo_vehiculo = c.id_tipo_vehiculo AND c.activa = TRUE
  LEFT JOIN (
    SELECT v.id_tipo_vehiculo, COUNT(DISTINCT v.id_vehiculo) AS ocupadas
    FROM mensualidades m
    JOIN vehiculos v ON m.id_vehiculo = v.id_vehiculo
    WHERE m.estado = 'activa'
    GROUP BY v.id_tipo_vehiculo
  ) activos ON tv.id_tipo_vehiculo = activos.id_tipo_vehiculo
  WHERE tv.activo = TRUE
  GROUP BY tv.id_tipo_vehiculo, tv.codigo, activos.ocupadas
`;

export const listarCupos = async (_req, res) => {
  try {
    let rows;
    try {
      rows = await query(
        `SELECT tipo_vehiculo, plazas_disponibles FROM v_resumen_cupos ORDER BY tipo_vehiculo`,
      );
    } catch (err) {
      // La vista no existe (BD creada con parqueadero.sql sin ejecutar seed):
      // se calcula al vuelo para no romper el dashboard.
      if (err.code === "ER_NO_SUCH_TABLE") {
        console.warn(
          "[cupos] Vista v_resumen_cupos no existe; usando consulta fallback. Ejecuta `npm run seed`.",
        );
        rows = await query(SQL_FALLBACK);
      } else {
        throw err;
      }
    }
    const carros = rows.find((r) => r.tipo_vehiculo === "carro");
    const motos = rows.find((r) => r.tipo_vehiculo === "moto");
    return responder(res, 200, "Cupos obtenidos.", {
      carros: carros ? Number(carros.plazas_disponibles) : 0,
      motos: motos ? Number(motos.plazas_disponibles) : 0,
    });
  } catch (err) {
    console.error(err);
    return responder(res, 500, MSG.ERROR_INTERNO);
  }
};
