// Zona horaria y formato de fechas (antes repetido en 3 archivos).
export const ZONA_HORARIA = "America/Bogota";
export const OFFSET_BOGOTA_HORAS = 5; // Colombia no usa horario de verano

export const SQL_HOY_BOGOTA = `DATE(UTC_TIMESTAMP() - INTERVAL ${OFFSET_BOGOTA_HORAS} HOUR)`;
export const sqlFechaBogota = (col) =>
  `DATE(${col} - INTERVAL ${OFFSET_BOGOTA_HORAS} HOUR)`;

export const formatearFechaHora = (d = new Date()) => {
  const f = new Date(d);
  return {
    fecha: f.toLocaleDateString("es-CO", { timeZone: ZONA_HORARIA }),
    hora: f.toLocaleTimeString("es-CO", {
      timeZone: ZONA_HORARIA,
      hour: "2-digit",
      minute: "2-digit",
    }),
  };
};

export const formatearPermanencia = (min) => {
  const m = Math.max(Number(min) || 0, 0);
  const d = Math.floor(m / 1440);
  const h = Math.floor((m % 1440) / 60);
  const r = m % 60;
  return [d && `${d} d`, (d || h) && `${h} h`, `${r} min`]
    .filter(Boolean)
    .join(" ");
};