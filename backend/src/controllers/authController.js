// Controladores de autenticación y registro de usuarios.
import * as authService from "../services/authService.js";
import { validarDatosUsuario } from "../middleware/validation.js";
import { responder } from "../utils/responseHelper.js";
import { MSG } from "../utils/messages.js";

export const register = async (req, res) => {
  try {
    // Antes: `req.body` sin `?? {}` -> TypeError (500) si el cliente no enviaba JSON.
    const { claveAdmin, ...datos } = req.body ?? {};
    if (!claveAdmin)
      return responder(res, 422, MSG.CAMPOS_OBLIGATORIOS);

    if (!req.user)
      return responder(res, 401, MSG.TOKEN_REQUERIDO);

    const auth = await authService.verificarClaveUsuario({
      usuario_login: req.user.usuario_login,
      clave: claveAdmin,
    });
    // 403 y no 401: el front interpreta 401 como "sesión vencida" y cerraba la sesión del admin
    // cada vez que se equivocaba al escribir su clave.
    if (auth.status !== 200)
      return responder(res, 403, "Clave de administrador incorrecta");

    const invalido = validarDatosUsuario(datos);
    if (invalido) return responder(res, 422, invalido);
    
    const r = await authService.registrar(datos, req.user);
    responder(res, r.status, r.mensaje || r.error, r.body || (r.usuario ? {usuario: r.usuario} : {}));
  } catch (err) {
    console.error(err);
    responder(res, 500, MSG.ERROR_INTERNO);
  }
};

export const login = async (req, res) => {
  try {
    const r = await authService.login(req, req.body);
    responder(res, r.status, r.mensaje || r.error, r.body || (r.usuario ? {usuario: r.usuario} : {}));
  } catch (err) {
    console.error(err);
    responder(res, 500, MSG.ERROR_INTERNO);
  }
};

export const me = (req, res) => {
  const {
    id_usuario,
    usuario_login,
    rol,
    nombres,
    apellidos,
    nombreCompleto,
    email,
    telefono,
    estado,
  } = req.user;
  return responder(res, 200, "Información de usuario obtenida", {
    id_usuario,
    usuario_login,
    rol,
    nombres,
    apellidos,
    nombreCompleto,
    email,
    telefono,
    estado,
  });
};

export const verifyPassword = async (req, res) => {
  try {
    const r = await authService.verificarClaveUsuario({
      usuario_login: req.user.usuario_login,
      clave: req.body?.clave,
    });
    responder(res, r.status, r.mensaje || r.error, r.body || (r.usuario ? {usuario: r.usuario} : {}));
  } catch (err) {
    console.error(err);
    responder(res, 500, MSG.ERROR_INTERNO);
  }
};

export const logout = async (req, res) => {
  try {
    const r = await authService.logout({
      idUsuario: req.user.id_usuario,
      token: req.headers.authorization?.split(" ")[1],
    });
    responder(res, r.status, r.mensaje || r.error, r.body || (r.usuario ? {usuario: r.usuario} : {}));
  } catch (err) {
    console.error(err);
    responder(res, 500, MSG.ERROR_INTERNO);
  }
};

export const refresh = async (req, res) => {
  try {
    const r = await authService.refresh({ refresh_token: req.body?.refresh_token });
    responder(res, r.status, r.mensaje || r.error, r.body || (r.usuario ? {usuario: r.usuario} : {}));
  } catch (err) {
    console.error(err);
    responder(res, 500, MSG.ERROR_INTERNO);
  }
};

export default { register, login, me, verifyPassword, logout, refresh };
