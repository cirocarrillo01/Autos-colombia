-- 008: la app solo CONFIRMA pagos hechos por fuera; no hay monto recibido, método,
-- referencia ni cierre de caja por método. Requiere MySQL 8.0.16+ (DROP CHECK).
-- Haga backup antes (mysqldump) y ejecute ANTES de desplegar el nuevo mensualidadService.js.
-- Verifique primero: SHOW CREATE TABLE pagos;

USE autos_colombia;   -- repita con autos_colombia_test para la BD de pruebas

-- 1) El CHECK usa monto_recibido: hay que quitarlo antes de borrar la columna.
ALTER TABLE pagos DROP CHECK chk_pago_montos;

-- 2) Quitar columnas de cobro; el índice (id_turno, metodo_pago) pasa a (id_turno).
ALTER TABLE pagos
  DROP INDEX ix_pago_turno,
  DROP COLUMN metodo_pago,
  DROP COLUMN monto_recibido,
  DROP COLUMN referencia,
  ADD KEY ix_pago_turno (id_turno);

-- 3) Nuevo CHECK solo sobre el monto de referencia.
ALTER TABLE pagos ADD CONSTRAINT chk_pago_monto CHECK (monto > 0);

-- 4) Turnos: sin totales por método (nunca se escribían).
ALTER TABLE turnos
  DROP COLUMN total_efectivo,
  DROP COLUMN total_transferencia,
  DROP COLUMN total_tarjeta,
  DROP COLUMN total_qr,
  DROP COLUMN total_general,
  DROP COLUMN diferencia;

-- 5) Índices que estaban comentados (créelos solo si no existen: SHOW INDEX FROM ...).
-- ALTER TABLE accesos_vehiculos ADD KEY ix_acceso_fecha_ingreso (fecha_ingreso);
-- ALTER TABLE login_attempts    ADD KEY ix_la_fecha (fecha_intento);