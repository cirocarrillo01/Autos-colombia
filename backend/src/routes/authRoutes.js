// backend/src/routes/authRoutes.js
// Rutas de autenticación:
//   POST /api/auth/register        (admin)
//   POST /api/auth/login           (público)
//   POST /api/auth/refresh         (público con refresh token)
//   GET  /api/auth/me              (autenticado)
//   POST /api/auth/verify-password (admin, re-autenticación)
//   POST /api/auth/logout          (autenticado)
//
// Nota: no existe cambio de clave "propia". El único que restablece
// contraseñas es el administrador desde /api/users/:id/password.

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

router.post("/login", login);
router.post("/refresh", refresh);
router.post(
  "/register",
  autenticar,
  roleMiddleware.autorizarRoles("administrador"),
  register,
);
router.get("/me", autenticar, me);
router.post(
  "/verify-password",
  autenticar,
  roleMiddleware.autorizarRoles("administrador"),
  verifyPassword,
);
router.post("/logout", autenticar, logout);

export default router;
