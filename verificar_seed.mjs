import { pool } from "./backend/src/config/db.js";

async function main() {
  const [vehiculos] = await pool.query(
    `SELECT v.id_vehiculo, v.placa, v.propietario_documento, tv.codigo AS tipo_codigo,
            m.fecha_inicio, m.fecha_fin, m.estado AS estado_mensualidad,
            (SELECT a.id_acceso FROM accesos_vehiculos a WHERE a.id_vehiculo = v.id_vehiculo AND a.fecha_salida IS NULL LIMIT 1) AS id_acceso
     FROM vehiculos v
     LEFT JOIN mensualidades m ON m.id_vehiculo = v.id_vehiculo
     LEFT JOIN tipos_vehiculos tv ON tv.id_tipo_vehiculo = v.id_tipo_vehiculo
     ORDER BY v.id_vehiculo
     LIMIT 30`
  );

  console.log("VEHICULOS (" + vehiculos.length + ")");
  for (const x of vehiculos) {
    console.log(JSON.stringify({
      placa: x.placa,
      documento: x.propietario_documento,
      tipo: x.tipo_codigo,
      fecha_inicio: x.fecha_inicio,
      fecha_fin: x.fecha_fin,
      estado_mensualidad: x.estado_mensualidad,
      tiene_acceso: !!x.id_acceso,
    }));
  }

  const [celdas] = await pool.query(
    `SELECT COUNT(*) AS n,
            SUM(CASE WHEN activa=1 THEN 1 ELSE 0 END) AS activas,
            SUM(CASE WHEN en_mantenimiento=1 THEN 1 ELSE 0 END) AS mantenimiento
     FROM celdas`
  );
  console.log("CELDA:", JSON.stringify(celdas[0]));
}

main().catch((e) => {
  console.error("ERR", e);
  process.exit(1);
});
