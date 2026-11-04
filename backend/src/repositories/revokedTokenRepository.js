//backend/src/repositories/revokedTokenRepository.js
// Gestión de Access Tokens revocados (JTI) para logout inmediato.

import { query } from "../config/db.js";

/**
 * Registra un token JWT como revocado.
 * @param {Object} params - { jti, id_usuario, expires_at }
 * @returns {Promise<void>}
 */
export const revocarToken = async ({ jti, id_usuario, expires_at }) => {
  await query(
    `INSERT INTO revoked_tokens (jti, id_usuario, expires_at)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE revoked_at = UTC_TIMESTAMP()`,
    [jti, id_usuario, expires_at],
  );
};

/**
 * Verifica si un JTI está revocado y no ha expirado.
 * @param {string} jti 
 * @returns {Promise<boolean>}
 */
export const estaRevocado = async (jti) => {
  const rows = await query(
    `SELECT jti FROM revoked_tokens WHERE jti = ? AND expires_at > UTC_TIMESTAMP()`,
    [jti],
  );
  return rows.length > 0;
};

/**
 * Limpia tokens revocados expirados de la tabla.
 * @returns {Promise<void>}
 */
export const limpiarRevocadosExpirados = async () => {
  await query(`DELETE FROM revoked_tokens WHERE expires_at <= UTC_TIMESTAMP()`);
};