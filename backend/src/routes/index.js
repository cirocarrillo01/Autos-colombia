// backend/src/routes/index.js
// Enrutador principal: app.js lo monta bajo /api.
//   GET  /api/health
//   GET  /api/vehiculos/:placa
//   GET  /api/celdas?tipo=carro|moto
//   POST /api/movimientos/entrada
//   POST /api/movimientos/salida

import { Router } from "express";
import vehiculos from "./vehiculos.js";
import celdas from "./celdas.js";
import movimientos from "./movimientos.js";

const router = Router();

router.get("/health", (_req, res) => {
  res.json({ status: "ok", message: "API Auto Colombia funcionando" });
});

router.use("/vehiculos", vehiculos);
router.use("/celdas", celdas);
router.use("/movimientos", movimientos);

export default router;
