// backend/src/routes/userRoutes.js
// Rutas de gestión de usuarios (RF1.5, RF1.6, RF1.7, RF1.8).
//   GET    /api/users                      listar/buscar (admin)
//   GET    /api/users/:id                  obtener (admin)
//   PUT    /api/users/:id                  editar + cambiar rol (admin)
//   PATCH  /api/users/:id/estado           activar/desactivar (admin)
//   PATCH  /api/users/:id/password         restablecer clave (admin)

import { Router } from "express";
import { autenticar } from "../middleware/authMiddleware.js";
import roleMiddleware from "../middleware/roleMiddleware.js";
import {
  listar,
  obtener,
  actualizar,
  cambiarEstado,
  restablecerPassword,
} from "../controllers/userController.js";

const router = Router();

// Todas las rutas de usuarios requieren autenticación y rol de administrador.
router.use(autenticar, roleMiddleware.autorizarRoles("administrador"));

router.get("/", listar);
router.get("/:id", obtener);
router.put("/:id", actualizar);
router.patch("/:id/estado", cambiarEstado);
router.patch("/:id/password", restablecerPassword);

export default router;