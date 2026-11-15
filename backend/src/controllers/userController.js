// Gestión de usuarios. Todas las rutas exigen administrador (ver userRoutes).
import * as userService from "../services/userServices.js";
import * as authService from "../services/authService.js";
import * as auditRepository from "../repositories/auditRepository.js";
import { validarClave } from "../middleware/validation.js";
import { responder } from "../utils/responseHelper.js";
import { MSG } from "../utils/messages.js";

/** Re-autenticación con la clave del admin. Devuelve {status,error} o null si es válida. */
const verificarClaveAdmin = async (req, claveAdmin) => {
  if (!claveAdmin)
    return {
      status: 422,
      error: MSG.CAMPOS_OBLIGATORIOS,
    };
  const r = await authService.verificarClaveUsuario({
    usuario_login: req.user.usuario_login,
    clave: claveAdmin,
  });
  return r.error ? r : null;
};

// Antes id_usuario del audit era el usuario AFECTADO y usuario_login el actor (inconsistente).
const auditar = (req, accion, detalle) =>
  auditRepository.registrarAudit({
    id_usuario: req.user.id_usuario,
    usuario_login: req.user.usuario_login,
    accion,
    recurso: "usuarios",
    detalle,
    ip_address: req.ip,
  });

export const listar = async (req, res) => {
  try {
    const { search, rol, estado, page, limit } = req.query;
    return responder(res, 200, MSG.LISTADO("Usuarios"), await userService.listarUsuarios({ search, rol, estado, page, limit }));
  } catch (err) {
    console.error(err);
    responder(res, 500, MSG.ERROR_INTERNO);
  }
};

export const obtener = async (req, res) => {
  try {
    const r = await userService.obtenerUsuario(Number(req.params.id));
    if (r.error) return responder(res, r.status, r.error);
    return responder(res, 200, MSG.ENCONTRADO("Usuario"), r.body);
  } catch (err) {
    console.error(err);
    responder(res, 500, MSG.ERROR_INTERNO);
  }
};

export const actualizar = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { estado: _ignorado, claveAdmin, ...datos } = req.body ?? {};
    const verif = await verificarClaveAdmin(req, claveAdmin);
    if (verif)
      return responder(res, verif.status === 400 ? 403 : verif.status, verif.error);
    if (id === req.user.id_usuario && datos.rol && datos.rol !== req.user.rol) {
      return responder(res, 400, "No puede cambiar su propio rol");
    }
    const r = await userService.editarUsuario(id, datos);
    if (r.status === 200)
      await auditar(req, "EDIT_USER", `Usuario ${id} actualizado`);
    if (r.error) return responder(res, r.status, r.error);
    return responder(res, 200, r.body.mensaje, r.body);
  } catch (err) {
    console.error(err);
    responder(res, 500, MSG.ERROR_INTERNO);
  }
};

export const cambiarEstado = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { estado } = req.body ?? {};
    if (id === req.user.id_usuario && estado === "inactivo") {
      return responder(res, 400, "No puede desactivarse a sí mismo");
    }
    const r = await userService.cambiarEstadoUsuario(id, estado);
    if (r.status === 200)
      await auditar(
        req,
        estado === "activo" ? "ACTIVATE_USER" : "DEACTIVATE_USER",
        `Usuario ${id} -> ${estado}`,
      );
    if (r.error) return responder(res, r.status, r.error);
    return responder(res, 200, r.body.mensaje);
  } catch (err) {
    console.error(err);
    responder(res, 500, MSG.ERROR_INTERNO);
  }
};

export const restablecerPassword = async (req, res) => {
  try {
    const { clave, claveAdmin } = req.body ?? {};
    const errorClave = validarClave(clave);
    if (errorClave) return responder(res, 422, errorClave);
    const verif = await verificarClaveAdmin(req, claveAdmin);
    if (verif)
      return responder(res, verif.status === 400 ? 403 : verif.status, verif.error);
    const r = await authService.restablecerClave({
      idUsuario: Number(req.params.id),
      claveNueva: clave,
      adminId: req.user.id_usuario,
    });
    if (r.error) return responder(res, r.status, r.error);
    return responder(res, 200, r.body.mensaje);
  } catch (err) {
    console.error(err);
    responder(res, 500, MSG.ERROR_INTERNO);
  }
};

export default {
  listar,
  obtener,
  actualizar,
  cambiarEstado,
  restablecerPassword,
};
