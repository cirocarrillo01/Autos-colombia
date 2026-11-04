//backend/src/routes/vehiculos.js
// Gestión de vehículos (RF2).

import { Router } from "express";
import { autenticar } from "../middleware/authMiddleware.js";
import roleMiddleware from "../middleware/roleMiddleware.js";
import {
  listarVehiculos,
  buscarVehiculoPorPlaca,
  crearVehiculo,
  actualizarVehiculo,
  cambiarEstadoVehiculo,
  asignarCeldaFija,
  liberarCeldaFija,
} from "../controllers/vehiculoController.js";

const router = Router();

/**
 * @route GET /api/vehiculos
 * @description Listar y buscar vehículos (admin, operador)
 */
router.get("/", autenticar, listarVehiculos);

/**
 * @route GET /api/vehiculos/:placa
 * @description Obtener vehículo por placa (para ingreso/salida)
 */
router.get("/:placa", autenticar, buscarVehiculoPorPlaca);

/**
 * @route POST /api/vehiculos
 * @description Registrar vehículo + propietario (admin, operador)
 */
router.post(
  "/",
  autenticar,
  roleMiddleware.autorizarRoles("administrador", "operador"),
  crearVehiculo,
);

/**
 * @route PUT /api/vehiculos/:placa
 * @description Editar datos del vehículo y propietario (admin, operador)
 */
router.put(
  "/:placa",
  autenticar,
  roleMiddleware.autorizarRoles("administrador", "operador"),
  actualizarVehiculo,
);

/**
 * @route PUT /api/vehiculos/:placa/celda
 * @deprecated Asignación de celdas fijas obsoleta (410 Gone)
 * @access Private (admin)
 */
router.put(
  "/:placa/celda",
  autenticar,
  roleMiddleware.autorizarRoles("administrador"),
  asignarCeldaFija,
);

/**
 * @route DELETE /api/vehiculos/:placa/celda
 * @deprecated Liberación de celdas fijas obsoleta (410 Gone)
 * @access Private (admin)
 */
router.delete(
  "/:placa/celda",
  autenticar,
  roleMiddleware.autorizarRoles("administrador"),
  liberarCeldaFija,
);

/**
 * @route PATCH /api/vehiculos/:placa/estado
 * @description Activar/desactivar vehículo (no si está dentro) (admin, operador)
 */
router.patch(
  "/:placa/estado",
  autenticar,
  roleMiddleware.autorizarRoles("administrador", "operador"),
  cambiarEstadoVehiculo,
);

export default router;