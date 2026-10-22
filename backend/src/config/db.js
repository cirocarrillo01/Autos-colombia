// backend/config/db.js
// ============================================================================
// CONEXION A BASE DE DATOS MYSQL - BACKEND AUTO COLOMBIA
// ============================================================================
// Este archivo crea un pool de conexiones a MySQL usando el driver nativo mysql2
// (sin Prisma). Exporta una funci0n query() para ejecutar sentencias SQL desde
// los controladores.
//
// Que hace:
//   - Lee DATABASE_URL desde config/envLoader.js.
//   - Crea un pool de conexiones mysql2/promise con la URL de conexion.
//   - Exporta query(sql, params) para hacer consultas con placeholders (?).
//   - Exporta pool para uso avanzado si se necesita.
//
// Que sucede si se configura:
//   - Si MySQL no esto en ejecucion o la URL es incorrecta, las consultas
//     fallaron con un error de conexion claro.
//   - El pool reutiliza conexiones, mejorando el rendimiento bajo carga.
// ============================================================================

import { createPool } from "mysql2/promise";
import { env } from "./envLoader.js";

// El pool se arma con los campos sueltos de MySQL (DB_HOST, DB_PORT, DB_USER,
// DB_PASSWORD, DB_NAME) que exporta config/envLoader.js.
// Se usa la forma "objeto" (y no la URL) porque mysql2 no decodifica bien
// contraseñas con caracteres especiales cuando van dentro de una URL.
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

// Funcion helper para ejecutar consultas SQL con parametros seguros (?)
export async function query(sql, params = []) {
  try {
    const [rows] = await pool.query(sql, params);
    return rows;
  } catch (err) {
    console.error("? Error en consulta SQL:", err.message);
    console.error("   SQL:", sql);
    throw err;
  }
}
