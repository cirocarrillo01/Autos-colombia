// Controladores de autenticación y registro de usuarios.
import * as authService from "../services/authService.js";
import { validarDatosUsuario } from "../middleware/validation.js";

const responder = (res, r) =>
  res.status(r.status).json(r.error ? { error: r.error } : r.body);

export const register = async (req, res) => {
  // Antes: `req.body` sin `?? {}` -> TypeError (500) si el cliente no enviaba JSON.
  const { claveAdmin, ...datos } = req.body ?? {};
  if (!claveAdmin)
    return res
      .status(422)
      .json({ error: "Debe confirmar con su clave de administrador" });

  const auth = await authService.verificarClaveUsuario({
    usuario_login: req.user.usuario_login,
    clave: claveAdmin,
  });
  // 403 y no 401: el front interpreta 401 como "sesión vencida" y cerraba la sesión del admin
  // cada vez que se equivocaba al escribir su clave.
  if (auth.status !== 200)
    return res.status(403).json({ error: "Clave de administrador incorrecta" });

  const invalido = validarDatosUsuario(datos);
  if (invalido) return res.status(400).json({ error: invalido });
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
  res.json({
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
