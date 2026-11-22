-- Migración: tablas para RF05/RF06
CREATE TABLE IF NOT EXISTS mensualidades (
  id_mensualidad INT AUTO_INCREMENT PRIMARY KEY,
  id_vehiculo INT NOT NULL,
  id_turno INT NULL,
  id_usuario INT NULL,
  fecha_inicio DATE NOT NULL,
  fecha_fin DATE NOT NULL,
  estado ENUM('activa','pendiente','en_mora','cancelada','vencida') NOT NULL DEFAULT 'activa',
  valor DECIMAL(12,2) NOT NULL DEFAULT 0,
  fecha_registro DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fecha_cancelacion DATETIME NULL,
  id_usuario_cancela INT NULL,
  CONSTRAINT fk_mens_vehiculo FOREIGN KEY (id_vehiculo) REFERENCES vehiculos(id_vehiculo),
  INDEX ix_mens_vehiculo_fin (id_vehiculo, fecha_fin),
  INDEX ix_mens_estado (estado)
);

CREATE TABLE IF NOT EXISTS pagos (
  id_pago INT AUTO_INCREMENT PRIMARY KEY,
  id_mensualidad INT NOT NULL,
  id_usuario INT NULL,
  id_turno INT NULL,
  fecha_pago DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  monto DECIMAL(12,2) NOT NULL,
  monto_recibido DECIMAL(12,2) NOT NULL,
  metodo_pago VARCHAR(30) NOT NULL,
  CONSTRAINT fk_pago_mensualidad FOREIGN KEY (id_mensualidad) REFERENCES mensualidades(id_mensualidad),
  INDEX ix_pago_fecha (fecha_pago),
  INDEX ix_pago_metodo (metodo_pago)
);