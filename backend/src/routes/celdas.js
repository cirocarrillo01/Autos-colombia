//backend/src/routes/celdas.js
// Gestión completa de celdas (RF3).

import { Router } from "express";
import { autenticar } from "../middleware/authMiddleware.js";
import roleMiddleware from "../middleware/roleMiddleware.js";
import * as celdaCtrl from "../controllers/celdaController.js";

const router = Router();

/**
 * @route GET /api/celdas
 * @description Listar celdas con filtros y paginación (admin, operador)
 */
router.get("/", autenticar, celdaCtrl.listarCeldas);

/**
 * @route GET /api/celdas/disponibles
 * @description Celdas libres por tipo (para ingreso/salida)
 */
router.get("/disponibles", autenticar, celdaCtrl.obtenerCeldasDisponibles);

/**
 * @route GET /api/celdas/resumen
 * @description Resumen por tipo (RF3.9)
 */
router.get("/resumen", autenticar, celdaCtrl.resumenCeldas);

/**
 * @route GET /api/celdas/bloques
 * @description Celdas organizadas por bloques (RF3.10)
 */
router.get("/bloques", autenticar, celdaCtrl.celdasPorBloque);

/**
 * @route GET /api/celdas/tipos
 * @description Tipos de vehículo para formulario crear celda
 */
router.get("/tipos", autenticar, celdaCtrl.listarTipos);

/**
 * @route GET /api/celdas/:id
 * @description Obtener una celda por ID
 */
router.get("/:id", autenticar, celdaCtrl.obtenerCelda);

/**
 * @route POST /api/celdas
 * @description Crear celda (solo admin)
 */
router.post(
  "/",
  autenticar,
  roleMiddleware.autorizarRoles("administrador"),
  celdaCtrl.crearCelda,
);

/**
 * @route PUT /api/celdas/:id
 * @description Editar tipo de celda si no tiene vehículo (solo admin)
 */
router.put(
  "/:id",
  autenticar,
  roleMiddleware.autorizarRoles("administrador"),
  celdaCtrl.actualizarCelda,
);

/**
 * @route PATCH /api/celdas/:id/estado
 * @description Activar/inactivar/mantenimiento (solo admin)
 */
router.patch(
  "/:id/estado",
  autenticar,
  roleMiddleware.autorizarRoles("administrador"),
  celdaCtrl.cambiarEstadoCelda,
);

/**
 * @route DELETE /api/celdas/:id
 * @description Eliminar celda libre sin historial (solo admin)
 */
router.delete(
  "/:id",
  autenticar,
  roleMiddleware.autorizarRoles("administrador"),
  celdaCtrl.eliminarCelda,
);

export default router;