// frontend/src/utils/formato.js
// Formateadores comunes (COP, fechas, días).
const fmtCOP = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

export const money = (n) => fmtCOP.format(Number(n ?? 0));

const MESES = [
  "ene",
  "feb",
  "mar",
  "abr",
  "may",
  "jun",
  "jul",
  "ago",
  "sept",
  "oct",
  "nov",
  "dic",
];

/**
 * Fechas de solo día ("YYYY-MM-DD" o ISO a medianoche UTC): se formatean SIN
 * convertir de zona horaria, para que no se vea un día menos en Colombia.
 */
export const fecha = (iso) => {
  if (!iso) return "—";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso));
  if (m) return `${m[3]} ${MESES[Number(m[2]) - 1]} ${m[1]}`;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("es-CO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

/** Fecha y hora (timestamps reales): sí se convierten a la hora local. */
export const fechaHora = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("es-CO", { dateStyle: "medium", timeStyle: "short" });
};

export const diasTexto = (n) => {
  if (n === null || n === undefined) return "—";
  if (n === 0) return "Vence hoy";
  if (n === 1) return "Vence mañana";
  if (n > 1) return `En ${n} días`;
  if (n === -1) return "Venció ayer";
  return `Hace ${Math.abs(n)} días`;
};
