// backend/src/utils/mensualidad.js
// Reglas de mensualidades (RF05/RF06).
// Todas las fechas se manejan como texto "YYYY-MM-DD" en hora de Bogotá,
// para evitar corrimientos de un día por zona horaria.
import { SQL_HOY_BOGOTA, ZONA_HORARIA } from "./fechas.js";

/** Estados derivados (RF06.1) */
export const ESTADO_MENSUALIDAD = {
  AL_DIA: "Al día",
  PENDIENTE: "Pendiente", // último día pagado (fecha_fin): aún puede entrar
  SIN_MENSUALIDAD: "Sin mensualidad",
};

/** Mensaje de bloqueo por estado (antes era un string y MENSAJE_BLOQUEO[estado] daba undefined). */
export const MENSAJE_BLOQUEO = {
  [ESTADO_MENSUALIDAD.SIN_MENSUALIDAD]:
    "Vehículo bloqueado por falta de mensualidad",
};

/** Estados que permiten el ingreso del vehículo. */
export const ESTADOS_PERMITEN_INGRESO = [
  ESTADO_MENSUALIDAD.AL_DIA,
  ESTADO_MENSUALIDAD.PENDIENTE,
];
export const puedeIngresar = (estado) =>
  ESTADOS_PERMITEN_INGRESO.includes(estado);

/** Cupos por tipo (RF05.10). */
export const CUPOS_POR_TIPO = { carro: 70, moto: 10 };

/** Ventana de renovación anticipada: faltan 0..5 días (RF05.4). */
export const DIAS_ANTICIPACION_MAX = 5;

/** Se mantiene por compatibilidad; el cupo ya no se cuenta por estado en BD. */
export const ESTADOS_QUE_OCUPAN_CUPO = ["activa", "pendiente"];

// ---------- Fechas (texto YYYY-MM-DD) ----------

/** Hoy en Bogotá como "YYYY-MM-DD". */
export const hoyBogota = () =>
  new Date().toLocaleDateString("en-CA", { timeZone: ZONA_HORARIA });

/** Convierte Date (DATE de MySQL llega como medianoche UTC) o string a "YYYY-MM-DD". */
export const aYMD = (v) => {
  if (!v) return null;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v).slice(0, 10);
};

const utc = (ymd) => {
  const [y, m, d] = ymd.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
};
const DIA_MS = 24 * 60 * 60 * 1000;

export const sumarDias = (ymd, n) =>
  new Date(utc(ymd) + n * DIA_MS).toISOString().slice(0, 10);

/** Días entre dos fechas (b - a). */
export const diasEntre = (a, b) => Math.round((utc(b) - utc(a)) / DIA_MS);

/** Fin del periodo = inicio + 1 mes - 1 día (ajusta meses cortos). */
export function calcularFin(inicio) {
  const [y, m, d] = inicio.split("-").map(Number);
  const ultimoDiaSiguiente = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  const dia = Math.min(d, ultimoDiaSiguiente);
  return sumarDias(
    new Date(Date.UTC(y, m, dia)).toISOString().slice(0, 10),
    -1,
  );
}

// ---------- Estado ----------

/**
 * Estado de una mensualidad (RF06.1).
 * - Fuera de [inicio, fin] o cancelada → Sin mensualidad
 * - hoy == fin → Pendiente (último día pagado)
 * - dentro del rango → Al día
 */
export function derivarEstado(fila, hoy = hoyBogota()) {
  if (!fila || fila.estado === "cancelada")
    return ESTADO_MENSUALIDAD.SIN_MENSUALIDAD;
  const ini = aYMD(fila.fecha_inicio);
  const fin = aYMD(fila.fecha_fin);
  if (!ini || !fin || hoy < ini || hoy > fin)
    return ESTADO_MENSUALIDAD.SIN_MENSUALIDAD;
  if (hoy === fin) return ESTADO_MENSUALIDAD.PENDIENTE;
  return ESTADO_MENSUALIDAD.AL_DIA;
}

export const estadoMensualidad = (fila) => derivarEstado(fila);

/** Estado de una fila del historial (mira otras filas para saber si hay periodo siguiente pagado). */
export function estadoFila(fila, filas, hoy = hoyBogota()) {
  if (!fila || fila.estado === "cancelada") return "cancelada";
  const ini = aYMD(fila.fecha_inicio);
  const fin = aYMD(fila.fecha_fin);
  if (ini > hoy) return ESTADO_MENSUALIDAD.AL_DIA; // pagada, aún no inicia
  const base = derivarEstado(fila, hoy);
  const haySiguiente = (filas ?? []).some(
    (f) => f.estado !== "cancelada" && aYMD(f.fecha_inicio) > fin,
  );
  return base === ESTADO_MENSUALIDAD.PENDIENTE && haySiguiente
    ? ESTADO_MENSUALIDAD.AL_DIA
    : base;
}

/** Estado global del vehículo a partir de todas sus mensualidades. */
export function estadoEfectivo(filas, hoy = hoyBogota()) {
  const vigente = elegirVigente(filas, hoy);
  if (!vigente)
    return { vigente: null, estado: ESTADO_MENSUALIDAD.SIN_MENSUALIDAD, fechaFin: null, siguientePagado: false };

  const finVigente = aYMD(vigente.fecha_fin);
  const ultimoFin = (filas ?? [])
    .filter((f) => f.estado !== "cancelada")
    .map((f) => aYMD(f.fecha_fin))
    .sort()
    .at(-1);

  return {
    vigente,
    estado: estadoFila(vigente, filas, hoy),
    fechaFin: ultimoFin, // hasta cuándo está realmente pagado
    siguientePagado: ultimoFin > finVigente,
  };
}

/** Días restantes para vencer (negativo si ya venció). */
export const diasParaVencer = (fechaFin, hoy = hoyBogota()) =>
  diasEntre(hoy, aYMD(fechaFin));

/** ¿Está dentro de la ventana de renovación? (0..5 días) */
export function puedeRenovarAnticipado(fechaFinVigente, hoy = hoyBogota()) {
  if (!fechaFinVigente) return false;
  const dias = diasParaVencer(fechaFinVigente, hoy);
  return dias >= 0 && dias <= DIAS_ANTICIPACION_MAX;
}

/**
 * Elige la mensualidad "vigente" de una lista (en JS):
 * 1. La que cubre hoy (inicio <= hoy <= fin)
 * 2. Si no hay, la MÁS RECIENTE que ya esté pagada (fecha_inicio > hoy, estado='activa') -> renovación anticipada
 * 3. Si no hay, la de mayor fecha_fin (historial reciente)
 * Ignora canceladas.
 */
export function elegirVigente(filas, hoy = hoyBogota()) {
  const ok = (filas ?? []).filter((f) => f.estado !== "cancelada");
  if (!ok.length) return null;

  // Ordenar por inicio DESC (la más reciente primero)
  const ordenadas = [...ok].sort((a, b) => aYMD(b.fecha_inicio).localeCompare(aYMD(a.fecha_inicio)));

  // 1. La que cubre hoy
  const cubre = ordenadas.find(
    (f) => aYMD(f.fecha_inicio) <= hoy && aYMD(f.fecha_fin) >= hoy,
  );
  if (cubre) return cubre;

  // 2. La más reciente pagada que empieza en el futuro (renovación anticipada ya pagada)
  const futura = ordenadas.find((f) => aYMD(f.fecha_inicio) > hoy);
  if (futura) return futura;

  // 3. La de mayor fecha_fin (historial)
  return ordenadas[0];
}

/**
 * ÚNICA fuente de verdad para el periodo a confirmar (la usan preview y registro).
 * - Sin mensualidad o ya vencida → inicia hoy.
 * - Con mensualidad que aún cubre → renovación: inicia el día siguiente a su fin,
 *   solo permitida si faltan 0..5 días.
 */
export function planificarPeriodo(vigente, hoy = hoyBogota()) {
  const finVigente =
    vigente && vigente.estado !== "cancelada" ? aYMD(vigente.fecha_fin) : null;
  const cubierta = !!finVigente && finVigente >= hoy;

  if (!cubierta) {
    return {
      esRenovacion: false,
      puedePagar: true,
      diasRestantes: null,
      inicio: hoy,
      fin: calcularFin(hoy),
    };
  }
  const diasRestantes = diasEntre(hoy, finVigente);
  const inicio = sumarDias(finVigente, 1);
  return {
    esRenovacion: true,
    puedePagar: diasRestantes <= DIAS_ANTICIPACION_MAX,
    diasRestantes,
    inicio,
    fin: calcularFin(inicio),
  };
}

// ---------- SQL ----------

/** ORDER BY para elegir la mensualidad vigente (la que cubre hoy primero). */
export const sqlOrdenVigente = (alias) =>
  `(${alias}.fecha_inicio <= ${SQL_HOY_BOGOTA} AND ${alias}.fecha_fin >= ${SQL_HOY_BOGOTA}) DESC, ${alias}.fecha_fin DESC`;

/** Mensualidad vigente por vehículo (1 parámetro: id_vehiculo). */
export const SQL_ULTIMA_MENSUALIDAD = `
  SELECT m.id_mensualidad, m.id_vehiculo, m.fecha_inicio, m.fecha_fin, m.estado,
         v.placa, v.id_tipo_vehiculo, tv.codigo AS tipo_codigo, tv.nombre AS tipo,
         tv.tarifa_mensual, v.propietario_nombre, v.propietario_documento
  FROM mensualidades m
  INNER JOIN vehiculos v ON v.id_vehiculo = m.id_vehiculo
  INNER JOIN tipos_vehiculos tv ON tv.id_tipo_vehiculo = v.id_tipo_vehiculo
  WHERE m.id_vehiculo = ?
    AND m.estado <> 'cancelada'
  ORDER BY ${sqlOrdenVigente("m")}
  LIMIT 1`;
