// backend/src/routes/mensualidades.js
// Rutas de gestión de mensualidades y pagos (RF05/RF06).
import { Router } from "express";
import { autenticar } from "../middleware/authMiddleware.js";
import roleMiddleware from "../middleware/roleMiddleware.js";
import * as ctrl from "../controllers/mensualidadController.js";

const router = Router();
const staff = roleMiddleware.autorizarRoles("administrador", "operador");

// ---- RF06: consultas (administrador y operador) ----
router.get("/", autenticar, staff, ctrl.listarMensualidades);
router.get("/resumen", autenticar, staff, ctrl.resumenMensualidades);
router.get("/proximos-vencer", autenticar, staff, ctrl.proximosAVencer);
router.get("/detalle/:placa", autenticar, staff, ctrl.detallePorPlaca);
router.get("/previsualizar", autenticar, staff, ctrl.previsualizarPago);

// ---- RF05: escritura (administrador y operador) ----
router.post("/pago", autenticar, staff, ctrl.registrarPago);
// Cancela la mensualidad activa (RF05.11). Antes esta ruta eliminaba el vehículo.
router.post("/cancelar", autenticar, staff, ctrl.cancelarMensualidad);
// Elimina un vehículo sin historial (RF05.16).
router.post("/eliminar-vehiculo", autenticar, staff, ctrl.eliminarVehiculo);

export default router;
