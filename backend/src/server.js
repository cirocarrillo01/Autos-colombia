//backend/src/server.js
// Punto de entrada: verifica la conexión a MySQL y levanta Express.

import { env } from "./config/envLoader.js";
import { pool } from "./config/db.js";
import app from "./app.js";

/**
 * Función principal para iniciar el servidor.
 * Verifica la BD y arranca Express.
 */
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