// Gestión de usuarios. Todas las rutas exigen administrador (ver userRoutes).
import * as userService from "../services/userServices.js";
import * as authService from "../services/authService.js";
import * as auditRepository from "../repositories/auditRepository.js";
import { validarClave } from "../middleware/validation.js";

const responder = (res, r) =>
  res.status(r.status).json(r.error ? { error: r.error } : r.body);

/** Re-autenticación con la clave del admin. Devuelve {status,error} o null si es válida. */
const verificarClaveAdmin = async (req, claveAdmin) => {
  if (!claveAdmin)
    return {
      status: 422,
      error: "Debe confirmar con su clave de administrador",
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
  const { search, rol, estado, page, limit } = req.query;
  res.json(
    await userService.listarUsuarios({ search, rol, estado, page, limit }),
  );
};

export const obtener = async (req, res) =>
  responder(res, await userService.obtenerUsuario(Number(req.params.id)));

export const actualizar = async (req, res) => {
  const id = Number(req.params.id);
  const { estado: _ignorado, claveAdmin, ...datos } = req.body ?? {};
  const verif = await verificarClaveAdmin(req, claveAdmin);
  if (verif)
    return res
      .status(verif.status === 400 ? 403 : verif.status)
      .json({ error: verif.error });
  if (id === req.user.id_usuario && datos.rol && datos.rol !== req.user.rol) {
    return res.status(400).json({ error: "No puede cambiar su propio rol" });
  }
  const r = await userService.editarUsuario(id, datos);
  if (r.status === 200)
    await auditar(req, "EDIT_USER", `Usuario ${id} actualizado`);
  responder(res, r);
};

export const cambiarEstado = async (req, res) => {
  const id = Number(req.params.id);
  const { estado } = req.body ?? {};
  if (id === req.user.id_usuario && estado === "inactivo") {
    return res.status(400).json({ error: "No puede desactivarse a sí mismo" });
  }
  const r = await userService.cambiarEstadoUsuario(id, estado);
  if (r.status === 200)
    await auditar(
      req,
      estado === "activo" ? "ACTIVATE_USER" : "DEACTIVATE_USER",
      `Usuario ${id} -> ${estado}`,
    );
  responder(res, r);
};

export const restablecerPassword = async (req, res) => {
  const { clave, claveAdmin } = req.body ?? {};
  const errorClave = validarClave(clave);
  if (errorClave) return res.status(400).json({ error: errorClave });
  const verif = await verificarClaveAdmin(req, claveAdmin);
  if (verif)
    return res
      .status(verif.status === 400 ? 403 : verif.status)
      .json({ error: verif.error });
  responder(
    res,
    await authService.restablecerClave({
      idUsuario: Number(req.params.id),
      claveNueva: clave,
      adminId: req.user.id_usuario,
    }),
  );
};

export default {
  listar,
  obtener,
  actualizar,
  cambiarEstado,
  restablecerPassword,
};
