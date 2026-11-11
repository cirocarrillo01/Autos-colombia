// Pool MySQL (mysql2/promise), helper query() y conTransaccion().
import { createPool } from "mysql2/promise";
import { env } from "./envLoader.js";

export const pool = createPool({
  host: env.DB_HOST,
  port: env.DB_PORT,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: "utf8mb4",
  timezone: "Z",
});

/** Consulta parametrizada; devuelve solo las filas. */
export async function query(sql, params = []) {
  try {
    const [filas] = await pool.query(sql, params);
    return filas;
  } catch (err) {
    console.error("Error en consulta SQL:", err.message, "\nSQL:", sql);
    throw err;
  }
}

/**
 * Ejecuta `trabajo(conn)` dentro de UNA transacción real (misma conexión).
 * Commit si termina bien, rollback si lanza.
 */
export async function conTransaccion(trabajo) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const r = await trabajo(conn);
    await conn.commit();
    return r;
  } catch (err) {
    try {
      await conn.rollback();
    } catch {
      /* conexión ya cerrada */
    }
    throw err;
  } finally {
    conn.release();
  }
}