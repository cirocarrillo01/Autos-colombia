//backend/src/routes/index.js
// Enrutador principal: app.js lo monta bajo /api.

import { Router } from "express";
import authRoutes from "./authRoutes.js";
import userRoutes from "./userRoutes.js";
import vehiculos from "./vehiculos.js";
import celdas from "./celdas.js";
import movimientos from "./movimientos.js";

const router = Router();

/**
 * @route GET /api/health
 * @returns {Object} { status: 'ok', message: string }
 */
router.get("/health", (_req, res) => {
  res.json({ status: "ok", message: "API Auto Colombia funcionando" });
});

router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/vehiculos", vehiculos);
router.use("/celdas", celdas);
router.use("/movimientos", movimientos);

export default router;