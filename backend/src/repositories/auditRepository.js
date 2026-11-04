//backend/src/repositories/auditRepository.js
// Registro de auditoría en la tabla audit_log.

import { query } from "../config/db.js";

/**
 * Registra una acción de auditoría.
 * @param {Object} data 
 * @param {number|null} data.id_usuario 
 * @param {string|null} data.usuario_login 
 * @param {string} data.accion 
 * @param {string|null} data.recurso 
 * @param {string|null} data.detalle 
 * @param {string} data.ip_address 
 * @returns {Promise<void>}
 */
export const registrarAudit = async ({
  id_usuario = null,
  usuario_login = null,
  accion,
  recurso = null,
  detalle = null,
  ip_address = "desconocida",
}) => {
  await query(
    `INSERT INTO audit_log (id_usuario, usuario_login, accion, recurso, detalle, ip_address)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id_usuario, usuario_login, accion, recurso, detalle, ip_address],
  );
};