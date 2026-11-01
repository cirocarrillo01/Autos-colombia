// backend/src/repositories/auditRepository.js
import { query } from "../config/db.js";

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