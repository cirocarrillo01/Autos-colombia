//backend/src/routes/userRoutes.js
// Rutas de gestión de usuarios (RF1.5, RF1.6, RF1.7, RF1.8).

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

/**
 * Middleware global: todas las rutas requieren admin autenticado.
 */
router.use(autenticar, roleMiddleware.autorizarRoles("administrador"));

/**
 * @route GET /api/users
 * @description Listar/buscar usuarios con paginación
 */
router.get("/", listar);

/**
 * @route GET /api/users/:id
 * @description Obtener un usuario por ID
 */
router.get("/:id", obtener);

/**
 * @route PUT /api/users/:id
 * @description Editar datos y cambiar rol
 */
router.put("/:id", actualizar);

/**
 * @route PATCH /api/users/:id/estado
 * @description Activar/desactivar usuario
 */
router.patch("/:id/estado", cambiarEstado);

/**
 * @route PATCH /api/users/:id/password
 * @description Restablecer clave de otro usuario
 */
router.patch("/:id/password", restablecerPassword);

export default router;