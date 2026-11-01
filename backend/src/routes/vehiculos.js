// backend/src/routes/vehiculos.js
// Gestión de vehículos (RF2).
//   GET    /api/vehiculos              listar y buscar (placa, documento, nombre) con paginación
//   GET    /api/vehiculos/:placa       obtener vehículo por placa
//   POST   /api/vehiculos              registrar vehículo + propietario
//   PUT    /api/vehiculos/:placa       editar datos del vehículo y del propietario
//   PATCH  /api/vehiculos/:placa/estado desactivar vehículo (no si está dentro)

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

router.get("/", autenticar, listarVehiculos);
router.get("/:placa", autenticar, buscarVehiculoPorPlaca);
router.post(
  "/",
  autenticar,
  roleMiddleware.autorizarRoles("administrador", "operador"),
  crearVehiculo,
);
router.put(
  "/:placa",
  autenticar,
  roleMiddleware.autorizarRoles("administrador", "operador"),
  actualizarVehiculo,
);
router.put(
  "/:placa/celda",
  autenticar,
  roleMiddleware.autorizarRoles("administrador"),
  asignarCeldaFija,
);
router.delete(
  "/:placa/celda",
  autenticar,
  roleMiddleware.autorizarRoles("administrador"),
  liberarCeldaFija,
);
router.patch(
  "/:placa/estado",
  autenticar,
  roleMiddleware.autorizarRoles("administrador", "operador"),
  cambiarEstadoVehiculo,
);

export default router;
