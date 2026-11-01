-- 006_create_refresh_tokens.sql
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id_refresh BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_usuario INT UNSIGNED NOT NULL,
  token VARCHAR(128) NOT NULL UNIQUE,
  expires_at DATETIME NOT NULL,
  revoked BOOLEAN NOT NULL DEFAULT FALSE,
  created_at DATETIME NOT NULL DEFAULT (UTC_TIMESTAMP()),
  FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario),
  KEY ix_refresh_user (id_usuario),
  KEY ix_refresh_expires (expires_at)
) ENGINE=InnoDB;
