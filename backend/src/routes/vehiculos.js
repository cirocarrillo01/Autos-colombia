// backend/src/routes/vehiculos.js

// ============================================================================
// RUTA: VEHECULOS
// ============================================================================
// GET /api/vehiculos/:placa
//
// Que hace:
//   - Consulta datos del vehiculo por placa (sin autenticacion para consulta publica).
//
// Que sucede si se configura:
//   - Si el vehiculo existe, retorna sus datos con propietario y estado de mensualidad.
//   - Si no existe, devuelve 404.
// ============================================================================

import { Router } from "express";
import { buscarVehiculoPorPlaca } from "../controllers/vehiculoController.js";

const router = Router();

router.get("/:placa", buscarVehiculoPorPlaca);

export default router;
