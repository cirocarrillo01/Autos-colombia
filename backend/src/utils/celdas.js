// Reglas compartidas de celdas (antes copiadas en celdaController y movimientoController).
import { pool } from "../config/db.js";

export const LIMITE_CELDAS = Object.freeze({ carro: 70, moto: 10 });
export const limiteCeldas = (codigoTipo) => LIMITE_CELDAS[codigoTipo] ?? null;

export const SQL_OCUPADA = `EXISTS (SELECT 1 FROM accesos_vehiculos a WHERE a.id_celda = c.id_celda AND a.fecha_salida IS NULL)`;

/** Prioridad: inactiva > en mantenimiento > ocupada > libre. */
export const ESTADO_SQL = `CASE
  WHEN c.activa = FALSE THEN 'inactiva'
  WHEN c.en_mantenimiento = TRUE AND (c.mantenimiento_hasta IS NULL OR c.mantenimiento_hasta > UTC_TIMESTAMP()) THEN 'en mantenimiento'
  WHEN ${SQL_OCUPADA} THEN 'ocupada'
  ELSE 'libre' END`;

const SQL_LIBERAR = `UPDATE celdas SET en_mantenimiento = FALSE, mantenimiento_hasta = NULL
  WHERE en_mantenimiento = TRUE AND mantenimiento_hasta IS NOT NULL AND mantenimiento_hasta <= UTC_TIMESTAMP()`;

/** Libera mantenimientos vencidos. `db` puede ser el pool o una conexión de transacción. */
export const liberarMantenimientosExpirados = (db = pool) =>
  db.query(SQL_LIBERAR);