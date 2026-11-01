-- 002_add_sesion_activa.sql
ALTER TABLE usuarios
  ADD COLUMN sesion_activa BOOLEAN NOT NULL DEFAULT FALSE AFTER ultimo_acceso,
  ADD COLUMN fecha_sesion_activa DATETIME NULL AFTER sesion_activa;
CREATE INDEX ix_usuario_sesion_activa ON usuarios (sesion_activa);
