// Refresh tokens. Ahora se guarda el SHA-256 (si se filtra la BD no hay tokens reutilizables).
import crypto from "node:crypto";
import { query } from "../config/db.js";

export const hashToken = (token) =>
  crypto.createHash("sha256").update(String(token)).digest("hex");

export const crearRefreshToken = async (id_usuario, dias = 7) => {
  const token = crypto.randomUUID() + crypto.randomUUID();
  await query(
    `INSERT INTO refresh_tokens (id_usuario, token, expires_at)
     VALUES (?, ?, DATE_ADD(UTC_TIMESTAMP(), INTERVAL ? DAY))`,
    [id_usuario, hashToken(token), dias],
  );
  return token;
};

export const validarRefreshToken = async (token) => {
  const rows = await query(
    `SELECT id_usuario FROM refresh_tokens
     WHERE token = ? AND revoked = FALSE AND expires_at > UTC_TIMESTAMP()`,
    [hashToken(token)],
  );
  return rows[0] ?? null;
};

export const revocarRefreshToken = (token) =>
  query(`UPDATE refresh_tokens SET revoked = TRUE WHERE token = ?`, [
    hashToken(token),
  ]);

export const revocarRefreshTokensUsuario = (id_usuario) =>
  query(`UPDATE refresh_tokens SET revoked = TRUE WHERE id_usuario = ?`, [
    id_usuario,
  ]);
