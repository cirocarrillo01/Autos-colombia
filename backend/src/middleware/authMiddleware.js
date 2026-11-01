// backend/src/middleware/authMiddleware.js
// Autenticación JWT + autorización por estado de usuario.
// - autenticar: valida el token Bearer, carga el usuario desde la BD y lo deja
//   en req.user (id_usuario, usuario_login, rol, nombres, apellidos, nombreCompleto, estado).
// - generarToken / verificarToken: helpers para firmar y validar JWT.
// Se usa en las rutas que requieren sesión (usuarios, celdas, vehículos, movimientos).

import { query } from "../config/db.js";
import jwt from "jsonwebtoken";
import crypto from "node:crypto";
import * as revokedTokenRepository from "../repositories/revokedTokenRepository.js";

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "8h";

if (!JWT_SECRET) {
  throw new Error(
    "Falta la variable de entorno JWT_SECRET. Revisa backend/.env (modelo en backend/.env.example).",
  );
}

/**
 * Firma un payload y devuelve el token JWT.
 * @param {object} payload - Datos mínimos del usuario (no incluir datos sensibles).
 * @returns {string}
 */
export const generarToken = (payload) => {
  const jti = crypto.randomUUID();
  return jwt.sign({ id_usuario: payload, jti }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
};

/**
 * Verifica y decodifica un token JWT.
 * @param {string} token
 * @returns {object} payload decodificado
 */
export const verificarToken = (token) => jwt.verify(token, JWT_SECRET);

/**
 * Middleware de autenticación obligatoria.
 * Requiere header: Authorization: Bearer <token>
 */
export const autenticar = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || "";
    const partes = authHeader.split(" ");
    if (
      partes.length !== 2 ||
      partes[0].toLowerCase() !== "bearer" ||
      !partes[1]
    ) {
      return res.status(401).json({ error: "Token de acceso requerido" });
    }

    const decoded = verificarToken(partes[1]);

    if (decoded.jti && (await revokedTokenRepository.estaRevocado(decoded.jti))) {
      return res.status(401).json({ error: "Token revocado o sesión cerrada" });
    }

    const usuarios = await query(
      `SELECT id_usuario, usuario_login, rol, nombres, apellidos, estado, ultimo_acceso
       FROM usuarios
       WHERE id_usuario = ?`,
      [decoded.id_usuario],
    );

    if (usuarios.length === 0) {
      return res.status(401).json({ error: "Usuario no encontrado" });
    }

    const u = usuarios[0];
    if (u.estado !== "activo") {
      return res
        .status(403)
        .json({ error: "Usuario inactivo. No puede iniciar sesión." });
    }

    req.user = {
      id_usuario: u.id_usuario,
      usuario_login: u.usuario_login,
      rol: u.rol,
      nombres: u.nombres,
      apellidos: u.apellidos,
      nombreCompleto: `${u.nombres} ${u.apellidos}`,
      estado: u.estado,
    };

    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res
        .status(401)
        .json({ error: "Sesión expirada. Inicie sesión de nuevo." });
    }
    if (err.name === "JsonWebTokenError") {
      return res.status(401).json({ error: "Token inválido" });
    }
    next(err);
  }
};

/**
 * Middleware opcional: si hay token válido carga el usuario, si no, continúa sin req.user.
 * Útil para rutas públicas que quieren personalizar si hay sesión.
 */
export const opcional = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || "";
    const partes = authHeader.split(" ");
    if (
      partes.length === 2 &&
      partes[0].toLowerCase() === "bearer" &&
      partes[1]
    ) {
      const decoded = verificarToken(partes[1]);
      const usuarios = await query(
        `SELECT id_usuario, usuario_login, rol, nombres, apellidos, email, telefono, estado, ultimo_acceso
        FROM usuarios WHERE id_usuario = ?`,
        [decoded.id_usuario],
      );
      if (usuarios.length > 0 && usuarios[0].estado === "activo") {
        const u = usuarios[0];
        req.user = {
          id_usuario: u.id_usuario,
          usuario_login: u.usuario_login,
          rol: u.rol,
          nombres: u.nombres,
          apellidos: u.apellidos,
          nombreCompleto: `${u.nombres} ${u.apellidos}`,
          email: u.email,
          telefono: u.telefono,
          estado: u.estado,
        };
      }
    }
    next();
  } catch {
    next();
  }
};

export default { autenticar, opcional, generarToken, verificarToken };
