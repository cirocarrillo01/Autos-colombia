// backend/src/routes/celdas.js
// GET /api/celdas?tipo=carro|moto - celdas libres, opcionalmente por tipo.

import { Router } from "express";
import { obtenerCeldasDisponibles } from "../controllers/celdaController.js";

const router = Router();

router.get("/", obtenerCeldasDisponibles);

export default router;
