// backend/src/controllers/userController.js
// Controladores de gestión de usuarios (RF1.5, RF1.6, RF1.7, RF1.8 admin).
// Todas las rutas requieren autenticación y, salvo listar/obtener, rol de administrador.

import * as userService from "../services/userServices.js";
import * as authService from "../services/authService.js";
import { validarClave } from "../middleware/validation.js";

/**
 * Re-autenticación del administrador que ejecuta la acción.
 * Valida la `claveAdmin` contra la clave del usuario autenticado (req.user).
 * Devuelve { status, error } si falla (clave faltante o incorrecta);
 * null si la clave es válida.
 */
const verificarClaveAdmin = async (req, claveAdmin) => {
  if (!claveAdmin)
    return { status: 422, error: "Debe confirmar con su clave de administrador" };
  const r = await authService.verificarClaveUsuario({
    usuario_login: req.user.usuario_login,
    clave: claveAdmin,
  });
  // null => clave válida; { status, error } => fallo de verificación.
  // Se devuelve null para que el controlador pueda usar `if (verif)`.
  return r.error ? r : null;
};

/**
 * GET /api/users
 * RF1.5 - Listar y buscar usuarios con paginación.
 */
export const listar = async (req, res) => {
  const { search, rol, estado, page, limit } = req.query;
  const resultado = await userService.listarUsuarios({
    search,
    rol,
    estado,
    page,
    limit,
  });
  res.json(resultado);
};

/**
 * GET /api/users/:id
 * Obtener un usuario por id.
 */
export const obtener = async (req, res) => {
  const resultado = await userService.obtenerUsuario(Number(req.params.id));
  res
    .status(resultado.status)
    .json(resultado.error ? { error: resultado.error } : resultado.body);
};

/**
 * PUT /api/users/:id
 * RF1.6 - Editar datos y cambiar rol (solo administrador).
 */
export const actualizar = async (req, res) => {
  const id = Number(req.params.id);
  // El estado se cambia por PATCH /estado, no por aquí.
  // claveAdmin se usa para re-autenticar al admin, no se persiste en el usuario.
  const { estado: _ignorado, claveAdmin, ...datos } = req.body ?? {};
  // Re-autenticación: el admin debe confirmar su clave antes de modificar datos.
  const verif = await verificarClaveAdmin(req, claveAdmin);
  if (verif) return res.status(verif.status).json({ error: verif.error });
  // Evita que el admin se quite el rol a sí mismo y se bloquee
  if (id === req.user.id_usuario && datos.rol && datos.rol !== req.user.rol) {
    return res.status(400).json({ error: "No puede cambiar su propio rol" });
  }
  const resultado = await userService.editarUsuario(id, datos);
  res
    .status(resultado.status)
    .json(resultado.error ? { error: resultado.error } : resultado.body);
};

/**
 * PATCH /api/users/:id/estado
 * RF1.7 - Activar o desactivar un usuario (solo administrador).
 */
export const cambiarEstado = async (req, res) => {
  const id = Number(req.params.id);
  const { estado } = req.body ?? {};
  if (id === req.user.id_usuario && estado === "inactivo") {
    return res.status(400).json({ error: "No puede desactivarse a sí mismo" });
  }
  const resultado = await userService.cambiarEstadoUsuario(id, estado);
  res
    .status(resultado.status)
    .json(resultado.error ? { error: resultado.error } : resultado.body);
};

/**
 * PATCH /api/users/:id/password
 * RF1.8 - Restablecer la clave de otro usuario (solo administrador).
 */
export const restablecerPassword = async (req, res) => {
  const { clave, claveAdmin } = req.body ?? {};
  const errorClave = validarClave(clave);
  if (errorClave) return res.status(400).json({ error: errorClave });
  // Re-autenticación: el admin debe confirmar su clave antes de cambiar la de otro.
  const verif = await verificarClaveAdmin(req, claveAdmin);
  if (verif) return res.status(verif.status).json({ error: verif.error });
  const resultado = await authService.restablecerClave({
    idUsuario: Number(req.params.id),
    claveNueva: clave,
  });
  res
    .status(resultado.status)
    .json(resultado.error ? { error: resultado.error } : resultado.body);
};

export default {
  listar,
  obtener,
  actualizar,
  cambiarEstado,
  restablecerPassword,
};
