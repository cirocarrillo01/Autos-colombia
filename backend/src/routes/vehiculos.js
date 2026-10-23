// backend/src/routes/vehiculos.js
// GET /api/vehiculos/:placa - consulta un vehiculo y su estado.

import { Router } from "express";
import { buscarVehiculoPorPlaca } from "../controllers/vehiculoController.js";

const router = Router();

router.get("/:placa", buscarVehiculoPorPlaca);

export default router;
