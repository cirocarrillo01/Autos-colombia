//backend/src/controllers/authController.js
// Controladores de autenticación, sesiones y registro de usuarios.

import * as authService from "../services/authService.js";
import { validarDatosUsuario } from "../middleware/validation.js";

/**
 * @function register
 * @description Registra un nuevo usuario en el sistema.
 * Requiere que el solicitante sea administrador y proporcione su propia clave (claveAdmin) como factor de seguridad adicional.
 * @param {import('express').Request} req - Body: { rol, tipo_documento, documento, nombres, apellidos, usuario_login, clave, claveAdmin }.
 * @param {import('express').Response} res
 * @returns {Promise<void>} JSON con el usuario creado (201) o error (400/401/409).
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
 * @function login
 * @description Autentica a un usuario y genera un par de tokens (Access y Refresh).
 * Implementa protección contra fuerza bruta vía middleware externo.
 * @param {import('express').Request} req - Body: { usuario_login, clave }.
 * @param {import('express').Response} res
 * @returns {Promise<void>} JSON con tokens y perfil del usuario (200).
 */
export const login = async (req, res) => {
  const resultado = await authService.login(req, req.body);
  if (resultado.error)
    return res.status(resultado.status).json({ error: resultado.error });
  res.status(resultado.status).json(resultado.body);
};

/**
 * @function me
 * @description Retorna el perfil completo del usuario autenticado basado en el token.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
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
 * @function verifyPassword
 * @description Valida si una contraseña coincide con la del usuario logueado. 
 * Útil para confirmaciones de acciones sensibles (step-up authentication).
 * @param {import('express').Request} req - Body: { clave }.
 * @param {import('express').Response} res
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
 * @function logout
 * @description Finaliza la sesión, revoca el Access Token (vía JTI) y elimina el Refresh Token.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
export const logout = async (req, res) => {
  const resultado = await authService.logout({
    idUsuario: req.user.id_usuario,
    token: req.headers.authorization?.split(" ")[1],
  });
  res.status(resultado.status).json(resultado.body);
};

/**
 * @function refresh
 * @description Genera un nuevo Access Token usando un Refresh Token válido y no rotado.
 * Implementa rotación de Refresh Token (el anterior queda invalidado).
 * @param {import('express').Request} req - Body: { refresh_token }.
 * @param {import('express').Response} res
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