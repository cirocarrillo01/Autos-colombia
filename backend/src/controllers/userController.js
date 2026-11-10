//backend/src/controllers/userController.js
// Controladores de gestión de usuarios (RF1.5, RF1.6, RF1.7, RF1.8 admin).
// Todas las rutas requieren autenticación y, salvo listar/obtener, rol de administrador.

import * as userService from "../services/userServices.js";
import * as authService from "../services/authService.js";
import * as auditRepository from "../repositories/auditRepository.js";
import { validarClave } from "../middleware/validation.js";

/**
 * @function verificarClaveAdmin
 * @description Validación de doble factor (re-autenticación) para acciones críticas.
 * Compara la contraseña provista en `claveAdmin` con las credenciales de quien hace la petición.
 * @param {import('express').Request} req - Petición Express que contiene el objeto `req.user`.
 * @param {string} claveAdmin - Contraseña del administrador ingresada en el modal de confirmación.
 * @returns {Promise<{status: number, error: string} | null>} Retorna un objeto con error si falla, o `null` si es válida.
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
 * @function listar
 * @description Obtiene el catálogo de usuarios del sistema (operadores y administradores).
 * Permite buscar por texto (nombre, apellido, documento, login), filtrar por rol/estado y paginar.
 * @param {import('express').Request} req - Query: { search, rol, estado, page, limit }.
 * @param {import('express').Response} res
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
 * @function obtener
 * @description Recupera el perfil detallado de un usuario por su ID numérico.
 * @param {import('express').Request} req - Params: id.
 * @param {import('express').Response} res
 */
export const obtener = async (req, res) => {
  const resultado = await userService.obtenerUsuario(Number(req.params.id));
  res
    .status(resultado.status)
    .json(resultado.error ? { error: resultado.error } : resultado.body);
};

/**
 * @function actualizar
 * @description Modifica los datos personales o el rol de un usuario.
 * Requiere `claveAdmin`. Un administrador no puede degradar su propio rol.
 * @param {import('express').Request} req - Params: id, Body: { nombres, apellidos, rol, email, telefono, claveAdmin }.
 * @param {import('express').Response} res
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
 * @function cambiarEstado
 * @description Activa o desactiva a un usuario para permitirle o prohibirle el acceso al sistema.
 * Un administrador no puede desactivarse a sí mismo. Al desactivar, se cierran las sesiones activas del usuario.
 * @param {import('express').Request} req - Params: id, Body: { estado: 'activo'|'inactivo' }.
 * @param {import('express').Response} res
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
 * @function restablecerPassword
 * @description Permite a un administrador cambiar la clave de otro usuario.
 * Requiere re-autenticación (claveAdmin) y valida el formato de la nueva clave.
 * @param {import('express').Request} req - Params: id, Body: { clave, claveAdmin }.
 * @param {import('express').Response} res
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