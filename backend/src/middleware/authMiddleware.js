// Autenticación JWT (HS256) + estado del usuario.
import jwt from "jsonwebtoken";
import crypto from "node:crypto";
import { env } from "../config/envLoader.js";
import { query } from "../config/db.js";
import * as revokedTokenRepository from "../repositories/revokedTokenRepository.js";
import { responder } from "../utils/responseHelper.js";
import { MSG } from "../utils/messages.js";

const ALGORITMO = "HS256";

export const generarToken = (idUsuario) =>
  jwt.sign(
    { id_usuario: idUsuario, jti: crypto.randomUUID() },
    env.JWT_SECRET,
    {
      expiresIn: env.JWT_EXPIRES_IN,
      algorithm: ALGORITMO,
    },
  );

export const verificarToken = (token) =>
  jwt.verify(token, env.JWT_SECRET, { algorithms: [ALGORITMO] });

/** "Bearer xxx" -> "xxx" | null */
export function extraerBearer(header = "") {
  const partes = String(header).split(" ");
  if (partes.length !== 2 || partes[0].toLowerCase() !== "bearer" || !partes[1])
    return null;
  return partes[1];
}

export const autenticar = async (req, res, next) => {
  try {
    const token = extraerBearer(req.headers.authorization);
    if (!token)
      return responder(res, 401, MSG.TOKEN_REQUERIDO);

    const decoded = verificarToken(token);
    if (
      decoded.jti &&
      (await revokedTokenRepository.estaRevocado(decoded.jti))
    ) {
      return responder(res, 401, "Token revocado o sesión cerrada");
    }

    // Incluye email y telefono: /auth/me los devolvía siempre como undefined.
    const [u] = await query(
      `SELECT id_usuario, usuario_login, rol, nombres, apellidos, email, telefono, estado
       FROM usuarios WHERE id_usuario = ?`,
      [decoded.id_usuario],
    );
    if (!u) return responder(res, 401, "Usuario no encontrado");
    if (u.estado !== "activo") {
      return responder(res, 403, "Usuario inactivo. No puede iniciar sesión.");
    }

    req.user = { ...u, nombreCompleto: `${u.nombres} ${u.apellidos}` };
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return responder(res, 401, MSG.SESION_EXPIRADA);
    }
    if (err.name === "JsonWebTokenError" || err.name === "NotBeforeError") {
      return responder(res, 401, "Token inválido");
    }
    next(err);
  }
};

export default { autenticar, generarToken, verificarToken, extraerBearer };
