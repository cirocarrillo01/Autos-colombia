//backend/src/routes/index.js
// Enrutador principal: app.js lo monta bajo /api.

import { Router } from "express";
import authRoutes from "./authRoutes.js";
import userRoutes from "./userRoutes.js";
import vehiculos from "./vehiculos.js";
import celdas from "./celdas.js";
import movimientos from "./movimientos.js";

import { responder } from "../utils/responseHelper.js";
import { MSG } from "../utils/messages.js";
import mensualidadesRoutes from "./mensualidades.js";

const router = Router();

/**
 * @route GET /api/health
 * @returns {Object} { mensaje: string }
 */
router.get("/health", (_req, res) => {
  return responder(res, 200, "API Auto Colombia funcionando", { status: "ok" });
});

router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/vehiculos", vehiculos);
router.use("/celdas", celdas);
router.use("/movimientos", movimientos);
router.use("/mensualidades", mensualidadesRoutes);
export default router;
