// backend/src/routes/movimientos.js
// POST /api/movimientos/entrada - registra el ingreso de un vehiculo.
// POST /api/movimientos/salida  - registra la salida de un vehiculo.

import { Router } from "express";
import {
  registrarEntrada,
  registrarSalida,
} from "../controllers/movimientoController.js";

const router = Router();

router.post("/entrada", registrarEntrada);
router.post("/salida", registrarSalida);

export default router;
