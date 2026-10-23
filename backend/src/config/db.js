// backend/src/config/db.js
// Pool de conexiones MySQL (mysql2/promise) y helper query() con parametros (?).

import { createPool } from "mysql2/promise";
import { env } from "./envLoader.js";

// Se usan campos sueltos y no una URL: mysql2 no decodifica bien las
// contrasenas con caracteres especiales cuando van dentro de una URL.
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

export async function query(sql, params = []) {
  try {
    const [filas] = await pool.query(sql, params);
    return filas;
  } catch (err) {
    console.error("Error en consulta SQL:", err.message);
    console.error("SQL:", sql);
    throw err;
  }
}
