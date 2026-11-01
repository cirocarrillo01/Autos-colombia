-- Migración: Agregar campos de seguimiento de sesión activa
-- Ejecutar en la base de datos existente para agregar soporte a "Conectado/Desconectado" en tiempo real.

ALTER TABLE usuarios
  ADD COLUMN sesion_activa BOOLEAN NOT NULL DEFAULT FALSE AFTER ultimo_acceso,
  ADD COLUMN fecha_sesion_activa DATETIME NULL AFTER sesion_activa;

-- Índice para consultar rápidamente usuarios conectados
CREATE INDEX ix_usuario_sesion_activa ON usuarios (sesion_activa);

-- Mensaje de confirmación
SELECT 'Campos sesion_activa y fecha_sesion_activa agregados correctamente.' AS mensaje;