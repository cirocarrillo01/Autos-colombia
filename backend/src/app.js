// backend/src/app.js

// ============================================================================
// CONFIGURACIÓN DE EXPRESS - AUTO COLOMBIA
// ============================================================================
// Rutas disponibles:
//   GET  /api/health
//   GET  /api/vehiculos/:placa
//   GET  /api/celdas?tipo=carro|moto
//   POST /api/movimientos/entrada
//   POST /api/movimientos/salida
//
// Sin autenticación: la API es abierta y el operador/turno de los movimientos
// se resuelve en el backend (ver movimientoController.js).
// ============================================================================

import express from "express";
import cors from "cors";
import vehiculosRoutes from "./routes/vehiculos.js";
import celdasRoutes from "./routes/celdas.js";
import movimientosRoutes from "./routes/movimientos.js";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/vehiculos", vehiculosRoutes);
app.use("/api/celdas", celdasRoutes);
app.use("/api/movimientos", movimientosRoutes);

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", message: "API Auto Colombia funcionando" });
});

export default app;
