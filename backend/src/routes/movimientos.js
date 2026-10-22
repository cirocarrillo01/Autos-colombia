// backend/src/routes/movimientos.js

// ============================================================================
// RUTA: MOVIMIENTOS (Ingreso/Salida)
// ============================================================================
// POST /api/movimientos/entrada   - Registrar ingreso
// POST /api/movimientos/salida    - Registrar salida
//
// Que hace:
//   - Registra el ingreso y la salida de un vehiculo.
//   - No requiere autenticacion: el operador y el turno se resuelven en el
//     backend (operador por defecto + turno automatico).
// ============================================================================

import { Router } from "express";
import {
  registrarEntrada,
  registrarSalida,
} from "../controllers/movimientoController.js";

const router = Router();

router.post("/entrada", registrarEntrada);
router.post("/salida", registrarSalida);

export default router;
