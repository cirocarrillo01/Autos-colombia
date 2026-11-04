//backend/src/controllers/userController.js
// Controladores de gestión de usuarios (RF1.5, RF1.6, RF1.7, RF1.8 admin).
// Todas las rutas requieren autenticación y, salvo listar/obtener, rol de administrador.

import * as userService from "../services/userServices.js";
import * as authService from "../services/authService.js";
import * as auditRepository from "../repositories/auditRepository.js";
import { validarClave } from "../middleware/validation.js";

/**
 * Re-autenticación del administrador que ejecuta la acción.
 * Valida la `claveAdmin` contra la clave del usuario autenticado (req.user).
 * @param {import('express').Request} req - Request que debe contener al usuario autenticado (req.user).
 * @param {string} claveAdmin - Clave de administrador ingresada para confirmar la acción.
 * @returns {Promise<{status: number, error: string} | null>} null si es válida, objeto de error si falla.
 */
const verificarClaveAdmin = async (req, claveAdmin) => {
  if (!claveAdmin)
    return { status: 422, error: "Debe confirmar con su clave de administrador" };
  const r = await authService.verificarClaveUsuario({
    usuario_login: req.user.usuario_login,
    clave: claveAdmin,
  });
  return r.error ? r : null;
};

/**
 * GET /api/users
 * RF1.5 - Listar y buscar usuarios con paginación.
 * @param {import('express').Request} req - Query params: search, rol, estado, page, limit.
 * @param {import('express').Response} res
 * @returns {Promise<void>}
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
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @returns {Promise<void>}
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
 * @param {import('express').Request} req - Body: datos del usuario, claveAdmin para confirmar.
 * @param {import('express').Response} res
 * @returns {Promise<void>}
 */
export const actualizar = async (req, res) => {
  const id = Number(req.params.id);
  const { estado: _ignorado, claveAdmin, ...datos } = req.body ?? {};
  
  const verif = await verificarClaveAdmin(req, claveAdmin);
  if (verif) return res.status(verif.status).json({ error: verif.error });
  
  if (id === req.user.id_usuario && datos.rol && datos.rol !== req.user.rol) {
    return res.status(400).json({ error: "No puede cambiar su propio rol" });
  }
  const resultado = await userService.editarUsuario(id, datos);

  if (resultado.status === 200) {
    await auditRepository.registrarAudit({
      id_usuario: id,
      usuario_login: req.user.usuario_login,
      accion: "EDIT_USER",
      recurso: "usuarios",
      detalle: `Usuario ${id} actualizado por ${req.user.usuario_login}`,
    });
  }

  res
    .status(resultado.status)
    .json(resultado.error ? { error: resultado.error } : resultado.body);
};

/**
 * PATCH /api/users/:id/estado
 * RF1.7 - Activar o desactivar un usuario (solo administrador).
 * @param {import('express').Request} req - Body: estado (activo/inactivo).
 * @param {import('express').Response} res
 * @returns {Promise<void>}
 */
export const cambiarEstado = async (req, res) => {
  const id = Number(req.params.id);
  const { estado } = req.body ?? {};
  if (id === req.user.id_usuario && estado === "inactivo") {
    return res.status(400).json({ error: "No puede desactivarse a sí mismo" });
  }
  const resultado = await userService.cambiarEstadoUsuario(id, estado);

  if (resultado.status === 200) {
    await auditRepository.registrarAudit({
      id_usuario: id,
      usuario_login: req.user.usuario_login,
      accion: estado === "activo" ? "ACTIVATE_USER" : "DEACTIVATE_USER",
      recurso: "usuarios",
      detalle: `Usuario ${id} ${estado === "activo" ? "activado" : "desactivado"} por ${req.user.usuario_login}`,
    });
  }

  res
    .status(resultado.status)
    .json(resultado.error ? { error: resultado.error } : resultado.body);
};

/**
 * PATCH /api/users/:id/password
 * RF1.8 - Restablecer la clave de otro usuario (solo administrador).
 * @param {import('express').Request} req - Body: clave nueva, claveAdmin del admin.
 * @param {import('express').Response} res
 * @returns {Promise<void>}
 */
export const restablecerPassword = async (req, res) => {
  const { clave, claveAdmin } = req.body ?? {};
  const errorClave = validarClave(clave);
  if (errorClave) return res.status(400).json({ error: errorClave });
  
  const verif = await verificarClaveAdmin(req, claveAdmin);
  if (verif) return res.status(verif.status).json({ error: verif.error });
  
  const resultado = await authService.restablecerClave({
    idUsuario: Number(req.params.id),
    claveNueva: clave,
    adminId: req.user.id_usuario,
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