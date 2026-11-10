//backend/src/routes/movimientos.js
// Gestión de entrada y salida de vehículos (RF05).

import { Router } from "express";
import { autenticar } from "../middleware/authMiddleware.js";
import roleMiddleware from "../middleware/roleMiddleware.js";
import {
  registrarEntrada,
  registrarSalida,
  registrarReubicacion,
  listarAccesos,
  listarDentro,
} from "../controllers/movimientoController.js";

const router = Router();

/**
 * @route GET /api/movimientos/dentro
 * @description Buscar vehículos dentro por placa o documento (admin, operador)
 */
/** @route GET /api/movimientos/historial - Historial de accesos */
router.get("/historial", autenticar, listarAccesos);

/** @route GET /api/movimientos/dentro?q= - Vehículos dentro por placa o documento */
router.get("/dentro", autenticar, listarDentro);

/**
 * @route POST /api/movimientos/entrada
 * @description Registrar entrada de vehículo (admin, operador)
 */
router.post("/entrada", autenticar, registrarEntrada);

/**
 * @route POST /api/movimientos/salida
 * @description Registrar salida de vehículo (admin, operador)
 */
router.post("/salida", autenticar, registrarSalida);

/**
 * @route PATCH /api/movimientos/:id_acceso/celda
 * @description Reubicar vehículo a otra celda (solo admin)
 */
router.patch(
  "/:id_acceso/celda",
  autenticar,
  roleMiddleware.autorizarRoles("administrador"),
  registrarReubicacion,
);

export default router;