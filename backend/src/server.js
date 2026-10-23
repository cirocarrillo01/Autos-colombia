// backend/src/server.js
// Punto de entrada: verifica la conexion a MySQL y levanta Express.
// Requisitos: base creada con Script/parqueadero.sql, datos de prueba con
// `npm run seed` y backend/.env configurado.

import { env } from "./config/envLoader.js";
import { pool } from "./config/db.js";
import app from "./app.js";

async function main() {
  try {
    await pool.query("SELECT 1");
    console.log(`Conectado a MySQL (${env.DB_NAME})`);

    app.listen(env.PORT, () => {
      console.log(`Servidor en http://localhost:${env.PORT}/api`);
    });
  } catch (err) {
    console.error("Error al conectar a la base de datos:", err.message);
    process.exit(1);
  }
}

main();
