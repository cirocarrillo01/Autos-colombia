// Access tokens revocados (JTI) para logout inmediato.
import { query } from "../config/db.js";

export const revocarToken = ({ jti, id_usuario, expires_at }) =>
  query(
    `INSERT INTO revoked_tokens (jti, id_usuario, expires_at) VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE revoked_at = UTC_TIMESTAMP()`,
    [jti, id_usuario, expires_at],
  );

export const estaRevocado = async (jti) =>
  (
    await query(
      `SELECT jti FROM revoked_tokens WHERE jti = ? AND expires_at > UTC_TIMESTAMP()`,
      [jti],
    )
  ).length > 0;

export const limpiarRevocadosExpirados = () =>
  query(`DELETE FROM revoked_tokens WHERE expires_at <= UTC_TIMESTAMP()`);
