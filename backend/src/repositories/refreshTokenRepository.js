//backend/src/repositories/refreshTokenRepository.js
// Gestión de Refresh Tokens en BD.

import { query } from "../config/db.js";
import crypto from "node:crypto";

/**
 * Crea un nuevo refresh token para un usuario.
 * @param {number} id_usuario 
 * @param {number} dias - Días de validez.
 * @returns {Promise<string>} Token generado.
 */
export const crearRefreshToken = async (id_usuario, dias = 7) => {
  const token = crypto.randomUUID() + crypto.randomUUID();
  await query(
    `INSERT INTO refresh_tokens (id_usuario, token, expires_at)
     VALUES (?, ?, DATE_ADD(UTC_TIMESTAMP(), INTERVAL ? DAY))`,
    [id_usuario, token, dias],
  );
  return token;
};

/**
 * Valida un refresh token (no revocado, no expirado).
 * @param {string} token 
 * @returns {Promise<{id_usuario: number}|null>}
 */
export const validarRefreshToken = async (token) => {
  const rows = await query(
    `SELECT id_usuario FROM refresh_tokens
     WHERE token = ? AND revoked = FALSE AND expires_at > UTC_TIMESTAMP()`,
    [token],
  );
  return rows[0] ?? null;
};

/**
 * Revoca un refresh token específico.
 * @param {string} token 
 * @returns {Promise<void>}
 */
export const revocarRefreshToken = async (token) => {
  await query(`UPDATE refresh_tokens SET revoked = TRUE WHERE token = ?`, [token]);
};

/**
 * Revoca todos los refresh tokens de un usuario.
 * @param {number} id_usuario 
 * @returns {Promise<void>}
 */
export const revocarRefreshTokensUsuario = async (id_usuario) => {
  await query(`UPDATE refresh_tokens SET revoked = TRUE WHERE id_usuario = ?`, [
    id_usuario,
  ]);
};