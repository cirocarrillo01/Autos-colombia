//backend/src/controllers/authController.js
// Controladores de autenticación, sesiones y registro de usuarios.

import * as authService from "../services/authService.js";
import { validarDatosUsuario } from "../middleware/validation.js";

/**
 * POST /api/auth/register
 * Registra un nuevo usuario, validando previamente la clave del administrador.
 * @param {import('express').Request} req - Request con datos del usuario y claveAdmin.
 * @param {import('express').Response} res
 * @returns {Promise<void>}
 */
export const register = async (req, res) => {
  const { claveAdmin } = req.body;
  
  const resultadoAuth = await authService.verificarClaveUsuario({
    usuario_login: req.user.usuario_login,
    clave: claveAdmin,
  });

  if (resultadoAuth.status !== 200) {
    return res.status(401).json({ error: "Clave de administrador incorrecta" });
  }

  const errorValidacion = validarDatosUsuario(req.body);
  if (errorValidacion) return res.status(400).json({ error: errorValidacion });
  const resultado = await authService.registrar(req.body);
  res
    .status(resultado.status)
    .json(resultado.error ? { error: resultado.error } : resultado.body);
};

/**
 * POST /api/auth/login
 * Inicia sesión y genera tokens de acceso.
 * @param {import('express').Request} req - Login (usuario/clave).
 * @param {import('express').Response} res
 * @returns {Promise<void>}
 */
export const login = async (req, res) => {
  const resultado = await authService.login(req, req.body);
  if (resultado.error)
    return res.status(resultado.status).json({ error: resultado.error });
  res.status(resultado.status).json(resultado.body);
};

/**
 * GET /api/auth/me
 * Obtiene la información del usuario autenticado.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @returns {void}
 */
export const me = async (req, res) => {
  res.json({
    id_usuario: req.user.id_usuario,
    usuario_login: req.user.usuario_login,
    rol: req.user.rol,
    nombres: req.user.nombres,
    apellidos: req.user.apellidos,
    nombreCompleto: req.user.nombreCompleto,
    email: req.user.email,
    telefono: req.user.telefono,
    estado: req.user.estado,
  });
};

/**
 * POST /api/auth/verify-password
 * Verifica si la clave del usuario autenticado es correcta.
 * @param {import('express').Request} req - { clave }.
 * @param {import('express').Response} res
 * @returns {Promise<void>}
 */
export const verifyPassword = async (req, res) => {
  const { clave } = req.body ?? {};
  if (!clave) return res.status(400).json({ error: "La clave es obligatoria" });
  const resultado = await authService.verificarClaveUsuario({
    usuario_login: req.user.usuario_login,
    clave,
  });
  res
    .status(resultado.status)
    .json(resultado.error ? { error: resultado.error } : resultado.body);
};

/**
 * POST /api/auth/logout
 * Cierra la sesión y revoca el token actual.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @returns {Promise<void>}
 */
export const logout = async (req, res) => {
  const resultado = await authService.logout({
    idUsuario: req.user.id_usuario,
    token: req.headers.authorization?.split(" ")[1],
  });
  res.status(resultado.status).json(resultado.body);
};

/**
 * POST /api/auth/refresh
 * Refresca el token de acceso usando el token de refresco.
 * @param {import('express').Request} req - { refresh_token }.
 * @param {import('express').Response} res
 * @returns {Promise<void>}
 */
export const refresh = async (req, res) => {
  const { refresh_token } = req.body ?? {};
  const resultado = await authService.refresh({ refresh_token });
  if (resultado.error)
    return res.status(resultado.status).json({ error: resultado.error });
  res.status(resultado.status).json(resultado.body);
};

export default {
  register,
  login,
  me,
  verifyPassword,
  logout,
  refresh,
};