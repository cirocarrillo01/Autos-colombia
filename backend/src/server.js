// Punto de entrada: verifica MySQL, programa limpiezas y levanta Express.
import { env } from "./config/envLoader.js";
import { pool } from "./config/db.js";
import app from "./app.js";
import * as revokedTokenRepository from "./repositories/revokedTokenRepository.js";

async function main() {
  try {
    await pool.query("SELECT 1");
    console.log(`Conectado a MySQL (${env.DB_NAME})`);

    // limpiarRevocadosExpirados existía pero nunca se invocaba: la tabla crecía sin límite.
    const limpiar = () =>
      revokedTokenRepository
        .limpiarRevocadosExpirados()
        .catch((e) => console.error(e.message));
    await limpiar();
    setInterval(limpiar, 60 * 60 * 1000).unref();

    const server = app.listen(env.PORT, () =>
      console.log(`Servidor en http://localhost:${env.PORT}/api`),
    );
    app.use((req, res, next) => { console.log(req.method, req.url); next(); });
    const cerrar = () =>
      server.close(() => pool.end().then(() => process.exit(0)).catch((err) => { console.error("Error al cerrar el pool:", err.message); process.exit(1); }));
    process.on("SIGINT", cerrar);
    process.on("SIGTERM", cerrar);
  } catch (err) {
    console.error("Error al iniciar:", err.message);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Error no controlado al iniciar:", err);
  process.exitCode = 1;
});

