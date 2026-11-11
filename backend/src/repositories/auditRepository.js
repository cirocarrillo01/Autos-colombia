// Registro de auditoría (audit_log).
import { query } from "../config/db.js";

export const registrarAudit = ({
  id_usuario = null,
  usuario_login = null,
  accion,
  recurso = null,
  detalle = null,
  ip_address = "desconocida",
}) =>
  query(
    `INSERT INTO audit_log (id_usuario, usuario_login, accion, recurso, detalle, ip_address) VALUES (?, ?, ?, ?, ?, ?)`,
    [id_usuario, usuario_login, accion, recurso, detalle, ip_address],
  );
