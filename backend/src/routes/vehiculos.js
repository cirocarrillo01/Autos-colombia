// Rutas de vehículos (RF2). Se eliminó /propietario/:documento (duplicaba /documento/:documento).
import { Router } from "express";
import { autenticar } from "../middleware/authMiddleware.js";
import { autorizarRoles } from "../middleware/roleMiddleware.js";
import * as c from "../controllers/vehiculoController.js";

const router = Router();
const staff = autorizarRoles("administrador", "operador");

router.get("/", autenticar, c.listarVehiculos);
router.get("/documento/:documento", autenticar, c.buscarVehiculosPorDocumento);
router.get("/:placa", autenticar, c.buscarVehiculoPorPlaca);
router.post("/", autenticar, staff, c.crearVehiculo);
router.put("/:placa", autenticar, staff, c.actualizarVehiculo);
router.patch("/:placa/estado", autenticar, staff, c.cambiarEstadoVehiculo);
// Obsoletos (410 Gone)
router.put(
  "/:placa/celda",
  autenticar,
  autorizarRoles("administrador"),
  c.asignarCeldaFija,
);
router.delete(
  "/:placa/celda",
  autenticar,
  autorizarRoles("administrador"),
  c.liberarCeldaFija,
);

export default router;
