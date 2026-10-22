// backend/src/routes/celdas.js

// ============================================================================
// RUTA: CELDAS
// ============================================================================
// GET /api/celdas?tipo=carro|moto
//
// Que hace:
//   - Retorna celdas disponibles, opcionalmente filtradas por tipo.
//
// Que sucede si se configura:
//   - Retorna arreglo de celdas con codigo e ID.
// ============================================================================

import { Router } from "express";
import { obtenerCeldasDisponibles } from "../controllers/celdaController.js";

const router = Router();

router.get("/", obtenerCeldasDisponibles);

export default router;
