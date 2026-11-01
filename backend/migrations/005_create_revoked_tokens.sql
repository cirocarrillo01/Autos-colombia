-- 005_create_revoked_tokens.sql
CREATE TABLE IF NOT EXISTS revoked_tokens (
  id_revoked BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  jti VARCHAR(64) NOT NULL UNIQUE,
  id_usuario INT UNSIGNED,
  expires_at DATETIME NOT NULL,
  revoked_at DATETIME NOT NULL DEFAULT (UTC_TIMESTAMP()),
  KEY ix_revoked_expires (expires_at)
) ENGINE=InnoDB;
