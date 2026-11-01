// backend/src/routes/celdas.js
// Gestión completa de celdas (RF3).
//   GET    /api/celdas                 listar con filtros y paginación (admin y operador)
//   GET    /api/celdas/disponibles     celdas libres por tipo (para ingreso/salida)
//   GET    /api/celdas/:id             obtener una celda
//   POST   /api/celdas                 crear (solo admin)
//   PUT    /api/celdas/:id             editar tipo si no tiene vehículo asignado (solo admin)
//   PATCH  /api/celdas/:id/estado      activar/inactivar/mantenimiento (solo admin)
//   GET    /api/celdas/resumen         resumen por tipo (RF3.9)
//   GET    /api/celdas/bloques         organizadas por bloques (RF3.10)

import { Router } from "express";
import { autenticar } from "../middleware/authMiddleware.js";
import roleMiddleware from "../middleware/roleMiddleware.js";
import * as celdaCtrl from "../controllers/celdaController.js";

const router = Router();

// Lectura de celdas: autenticados (admin u operador).
router.get("/", autenticar, celdaCtrl.listarCeldas);
router.get("/disponibles", autenticar, celdaCtrl.obtenerCeldasDisponibles);
router.get("/resumen", autenticar, celdaCtrl.resumenCeldas);
router.get("/bloques", autenticar, celdaCtrl.celdasPorBloque);
router.get("/tipos", autenticar, celdaCtrl.listarTipos);
router.get("/:id", autenticar, celdaCtrl.obtenerCelda);

// Escritura de celdas: solo administrador.
router.post(
  "/",
  autenticar,
  roleMiddleware.autorizarRoles("administrador"),
  celdaCtrl.crearCelda,
);
router.put(
  "/:id",
  autenticar,
  roleMiddleware.autorizarRoles("administrador"),
  celdaCtrl.actualizarCelda,
);
router.patch(
  "/:id/estado",
  autenticar,
  roleMiddleware.autorizarRoles("administrador"),
  celdaCtrl.cambiarEstadoCelda,
);

router.delete(
  "/:id",
  autenticar,
  roleMiddleware.autorizarRoles("administrador"),
  celdaCtrl.eliminarCelda,
);

export default router;
