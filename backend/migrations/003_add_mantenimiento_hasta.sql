-- 003_add_mantenimiento_hasta.sql
ALTER TABLE celdas
  ADD COLUMN mantenimiento_hasta DATETIME NULL AFTER en_mantenimiento;
CREATE INDEX ix_celda_mantenimiento ON celdas (en_mantenimiento, mantenimiento_hasta);
