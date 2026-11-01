// backend/src/repositories/revokedTokenRepository.js
import { query } from "../config/db.js";

export const revocarToken = async ({ jti, id_usuario, expires_at }) => {
  await query(
    `INSERT INTO revoked_tokens (jti, id_usuario, expires_at)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE revoked_at = UTC_TIMESTAMP()`,
    [jti, id_usuario, expires_at],
  );
};

export const estaRevocado = async (jti) => {
  const rows = await query(
    `SELECT jti FROM revoked_tokens WHERE jti = ? AND expires_at > UTC_TIMESTAMP()`,
    [jti],
  );
  return rows.length > 0;
};

export const limpiarRevocadosExpirados = async () => {
  await query(`DELETE FROM revoked_tokens WHERE expires_at <= UTC_TIMESTAMP()`);
};