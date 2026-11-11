// Vigencia de mensualidades. Antes: "aún no inicia" se reportaba como "en mora".
import { SQL_HOY_BOGOTA } from "./fechas.js";

export const ESTADO_MENSUALIDAD = Object.freeze({
  AL_DIA: "Al día",
  EN_MORA: "En mora",
  PENDIENTE: "Pendiente",
  SIN: "Sin mensualidad",
});

export const MENSAJE_BLOQUEO = Object.freeze({
  [ESTADO_MENSUALIDAD.SIN]: "El vehículo no tiene mensualidad activa",
  [ESTADO_MENSUALIDAD.PENDIENTE]: "La mensualidad del vehículo aún no inicia",
  [ESTADO_MENSUALIDAD.EN_MORA]: "La mensualidad del vehículo está en mora",
});

export const SQL_VIGENTE = `(fecha_inicio <= ${SQL_HOY_BOGOTA} AND fecha_fin >= ${SQL_HOY_BOGOTA})`;

/** Prioriza una mensualidad vigente; si no hay, la de mayor fecha_fin. */
export const SQL_ULTIMA_MENSUALIDAD = `
  SELECT fecha_inicio, fecha_fin,
         ${SQL_VIGENTE} AS vigente,
         (fecha_inicio > ${SQL_HOY_BOGOTA}) AS pendiente
  FROM mensualidades
  WHERE id_vehiculo = ? AND estado = 'activa'
  ORDER BY vigente DESC, fecha_fin DESC
  LIMIT 1`;

/** Traduce la fila de SQL_ULTIMA_MENSUALIDAD (o undefined) al estado de negocio. */
export function estadoMensualidad(fila) {
  if (!fila) return ESTADO_MENSUALIDAD.SIN;
  if (Number(fila.vigente)) return ESTADO_MENSUALIDAD.AL_DIA;
  if (Number(fila.pendiente)) return ESTADO_MENSUALIDAD.PENDIENTE;
  return ESTADO_MENSUALIDAD.EN_MORA;
}
