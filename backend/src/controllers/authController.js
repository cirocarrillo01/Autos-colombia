// backend/src/controllers/authController.js
import * as authService from "../services/authService.js";
import { validarDatosUsuario } from "../middleware/validation.js";

export const register = async (req, res) => {
  const errorValidacion = validarDatosUsuario(req.body);
  if (errorValidacion) return res.status(400).json({ error: errorValidacion });
  const resultado = await authService.registrar(req.body);
  res
    .status(resultado.status)
    .json(resultado.error ? { error: resultado.error } : resultado.body);
};

export const login = async (req, res) => {
  const resultado = await authService.login(req, req.body);
  if (resultado.error)
    return res.status(resultado.status).json({ error: resultado.error });
  res.status(resultado.status).json(resultado.body);
};

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

export const logout = async (req, res) => {
  const resultado = await authService.logout({
    idUsuario: req.user.id_usuario,
    token: req.headers.authorization?.split(" ")[1],
  });
  res.status(resultado.status).json(resultado.body);
};

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
