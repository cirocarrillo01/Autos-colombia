// backend/src/repositories/refreshTokenRepository.js
import { query } from "../config/db.js";
import crypto from "node:crypto";

export const crearRefreshToken = async (id_usuario, dias = 7) => {
  const token = crypto.randomUUID() + crypto.randomUUID();
  await query(
    `INSERT INTO refresh_tokens (id_usuario, token, expires_at)
     VALUES (?, ?, DATE_ADD(UTC_TIMESTAMP(), INTERVAL ? DAY))`,
    [id_usuario, token, dias],
  );
  return token;
};

export const validarRefreshToken = async (token) => {
  const rows = await query(
    `SELECT id_usuario FROM refresh_tokens
     WHERE token = ? AND revoked = FALSE AND expires_at > UTC_TIMESTAMP()`,
    [token],
  );
  return rows[0] ?? null;
};

export const revocarRefreshToken = async (token) => {
  await query(`UPDATE refresh_tokens SET revoked = TRUE WHERE token = ?`, [token]);
};

export const revocarRefreshTokensUsuario = async (id_usuario) => {
  await query(`UPDATE refresh_tokens SET revoked = TRUE WHERE id_usuario = ?`, [
    id_usuario,
  ]);
};