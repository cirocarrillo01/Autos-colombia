// backend/src/routes/movimientos.js
// POST /api/movimientos/entrada - registra el ingreso de un vehículo.
// POST /api/movimientos/salida  - registra la salida de un vehículo.
// Requiere autenticación: el operador logueado queda registrado en el acceso.

import { Router } from "express";
import { autenticar } from "../middleware/authMiddleware.js";
import roleMiddleware from "../middleware/roleMiddleware.js";
import {
  registrarEntrada,
  registrarSalida,
  registrarReubicacion,
  listarAccesos,
} from "../controllers/movimientoController.js";

const router = Router();

router.get("/historial", autenticar, listarAccesos);
router.post("/entrada", autenticar, registrarEntrada);
router.post("/salida", autenticar, registrarSalida);
router.patch(
  "/:id_acceso/celda",
  autenticar,
  roleMiddleware.autorizarRoles("administrador"),
  registrarReubicacion,
);

export default router;
