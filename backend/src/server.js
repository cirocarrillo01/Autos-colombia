// backend/src/server.js

// ============================================================================
// SERVIDOR PRINCIPAL - BACKEND AUTO COLOMBIA
// ============================================================================
// Flujo de arranque:
//   1. Carga variables de entorno (config/envLoader.js, lee backend/.env).
//   2. Verifica la conexión al pool de MySQL.
//   3. Inicia Express en PORT.
//
// Requisitos:
//   - Base 'autos_colombia' creada con Script/parqueadero.sql.
//   - Datos iniciales cargados con: npm run seed
//   - DATABASE_URL definido en backend/.env
// ============================================================================

import { env } from "./config/envLoader.js";
import { pool } from "./config/db.js";
import app from "./app.js";

async function main() {
  try {
    await pool.query("SELECT 1");
    console.log("Conectado a la base de datos MySQL (autos_colombia)");

    app.listen(env.PORT, () => {
      console.log(`Servidor backend corriendo en http://localhost:${env.PORT}`);
      console.log("Endpoints disponibles:");
      console.log("   GET    /api/vehiculos/:placa");
      console.log("   GET    /api/celdas?tipo=carro|moto");
      console.log("   POST   /api/movimientos/entrada");
      console.log("   POST   /api/movimientos/salida");
      console.log("   GET    /api/health");
    });
  } catch (err) {
    console.error("Error al conectar a la base de datos:", err.message);
    process.exit(1);
  }
}

main();
