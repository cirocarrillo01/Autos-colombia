//backend/src/routes/authRoutes.js
// Rutas de autenticación.

import { Router } from "express";
import { autenticar } from "../middleware/authMiddleware.js";
import roleMiddleware from "../middleware/roleMiddleware.js";
import {
  register,
  login,
  me,
  verifyPassword,
  logout,
  refresh,
} from "../controllers/authController.js";

const router = Router();

/**
 * @route POST /api/auth/login
 * @description Iniciar sesión
 * @access Public
 */
router.post("/login", login);

/**
 * @route POST /api/auth/refresh
 * @description Renovar access token
 * @access Public (requiere refresh_token válido)
 */
router.post("/refresh", refresh);

/**
 * @route POST /api/auth/register
 * @description Registrar nuevo usuario (solo admin)
 * @access Private (admin + re-auth)
 */
router.post(
  "/register",
  autenticar,
  roleMiddleware.autorizarRoles("administrador"),
  register,
);

/**
 * @route GET /api/auth/me
 * @description Obtener usuario autenticado
 * @access Private
 */
router.get("/me", autenticar, me);

/**
 * @route POST /api/auth/verify-password
 * @description Verificar clave actual (re-autenticación admin)
 * @access Private (admin)
 */
router.post(
  "/verify-password",
  autenticar,
  roleMiddleware.autorizarRoles("administrador"),
  verifyPassword,
);

/**
 * @route POST /api/auth/logout
 * @description Cerrar sesión
 * @access Private
 */
router.post("/logout", autenticar, logout);

export default router;