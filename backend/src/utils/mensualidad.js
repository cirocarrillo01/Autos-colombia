// backend/src/utils/mensualidad.js
// Centralización de la lógica de vigencia de mensualidades

// Hoy en Bogotá (UTC-5)
const HOY = `DATE(UTC_TIMESTAMP() - INTERVAL 5 HOUR)`;

// Vigente = ya inició y no ha vencido
export const SQL_VIGENTE = `(fecha_inicio <= ${HOY} AND fecha_fin >= ${HOY})`;

// Prioriza una mensualidad vigente; si no hay, la más reciente
export const SQL_ULTIMA_MENSUALIDAD = `
  SELECT ${SQL_VIGENTE} AS vigente
  FROM mensualidades
  WHERE id_vehiculo = ? AND estado = 'activa'
  ORDER BY vigente DESC, fecha_fin DESC
  LIMIT 1`;
