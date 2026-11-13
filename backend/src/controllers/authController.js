// Controladores de autenticación y registro de usuarios.
import * as authService from "../services/authService.js";
import { validarDatosUsuario } from "../middleware/validation.js";
import { responder as responderHelper } from "../utils/responseHelper.js";

const responder = (res, r) =>
  responderHelper(res, r.status, r.error || r.mensaje, r.body || (r.usuario ? {usuario: r.usuario} : {}));

export const register = async (req, res) => {
  // Antes: `req.body` sin `?? {}` -> TypeError (500) si el cliente no enviaba JSON.
  const { claveAdmin, ...datos } = req.body ?? {};
  if (!claveAdmin)
    return responderHelper(res, 422, "Debe confirmar con su clave de administrador");

  if (!req.user)
    return responderHelper(res, 401, "No autenticado");

  const auth = await authService.verificarClaveUsuario({
    usuario_login: req.user.usuario_login,
    clave: claveAdmin,
  });
  // 403 y no 401: el front interpreta 401 como "sesión vencida" y cerraba la sesión del admin
  // cada vez que se equivocaba al escribir su clave.
  if (auth.status !== 200)
    return responderHelper(res, 403, "Clave de administrador incorrecta");

  const invalido = validarDatosUsuario(datos);
  if (invalido) return responderHelper(res, 422, invalido);
  responder(res, await authService.registrar(datos, req.user));
};

export const login = async (req, res) =>
  responder(res, await authService.login(req, req.body));

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
  return responderHelper(res, 200, "Información de usuario obtenida", {
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

export const verifyPassword = async (req, res) =>
  responder(
    res,
    await authService.verificarClaveUsuario({
      usuario_login: req.user.usuario_login,
      clave: req.body?.clave,
    }),
  );

export const logout = async (req, res) =>
  responder(
    res,
    await authService.logout({
      idUsuario: req.user.id_usuario,
      token: req.headers.authorization?.split(" ")[1],
    }),
  );

export const refresh = async (req, res) =>
  responder(
    res,
    await authService.refresh({ refresh_token: req.body?.refresh_token }),
  );

export default { register, login, me, verifyPassword, logout, refresh };
