-- 004_create_audit_log.sql
CREATE TABLE IF NOT EXISTS audit_log (
  id_audit BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_usuario INT UNSIGNED NULL,
  usuario_login VARCHAR(40),
  accion VARCHAR(60) NOT NULL,
  recurso VARCHAR(60),
  detalle VARCHAR(255),
  ip_address VARCHAR(45),
  fecha DATETIME NOT NULL DEFAULT (UTC_TIMESTAMP()),
  KEY ix_audit_usuario (id_usuario, fecha),
  KEY ix_audit_accion (accion, fecha)
) ENGINE=InnoDB;
