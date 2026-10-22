/* backend/Script/parqueadero.sql */
-- ============================================================================
-- PARQUEADERO "AUTOS COLOMBIA"
-- Sistema de mensualidades — MySQL 8.0.16+
-- ============================================================================
-- Modelo de negocio:
--   * Cobro únicamente por mensualidad. No existen tarifas por hora/día.
--   * Cada vehículo mensual tiene una celda fija asignada.
--   * Estado del cliente: pagado (mensualidad vigente) o en mora (vencida).
--     -> Es estado DERIVADO por fechas; no se almacena.
--   * Roles del sistema: administrador y operador.
--     Los clientes NO son usuarios; sus datos viven en vehiculos.*.
--   * Tipos de vehículo: moto y carro (el CHECK lo garantiza).
--   * Todo cobro se registra dentro de un turno de caja abierto.
--
-- Mapa de tablas:
--   usuarios            login admin/operador, operadores de acceso
--   tipos_vehiculos     moto, carro, con tarifa_mensual
--   celdas              spots físicos (letra-número) tipificados
--   puertas             entradas/salidas; una sola de noche
--   vehiculos           placa + propietario + celda_fija + tipo
--   turnos              caja por operador; uno abierto a la vez
--   mensualidades       periodo contratado por vehículo
--   pagos               pago de una mensualidad, dentro de un turno
--   accesos_vehiculos   ingreso/salida del vehículo
--   novedades           incidentes sobre un vehículo o acceso
--   login_attempts      anti fuerza bruta
-- ============================================================================
CREATE DATABASE IF NOT EXISTS autos_colombia
  CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
USE autos_colombia;


-- USUARIOS (solo administrador y operador)

CREATE TABLE usuarios (
  id_usuario      INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  rol             ENUM('administrador','operador') NOT NULL DEFAULT 'operador',
  tipo_documento  ENUM('cc','ce','nit','pasaporte') NOT NULL DEFAULT 'cc',
  documento       VARCHAR(20) NOT NULL,
  nombres         VARCHAR(80) NOT NULL,
  apellidos       VARCHAR(80) NOT NULL,
  telefono        VARCHAR(20),
  email           VARCHAR(120),
  usuario_login   VARCHAR(40) NOT NULL,
  clave_hash      VARCHAR(255) NOT NULL,
  estado          ENUM('activo','inactivo') NOT NULL DEFAULT 'activo',
  ultimo_acceso   DATETIME NULL,
  fecha_registro  DATETIME NOT NULL DEFAULT (UTC_TIMESTAMP()),
  UNIQUE KEY uq_usuario_documento (tipo_documento, documento),
  UNIQUE KEY uq_usuario_login     (usuario_login),
  UNIQUE KEY uq_usuario_email     (email),
  KEY ix_usuario_rol (rol, estado),
  CONSTRAINT chk_usuario_doc CHECK (CHAR_LENGTH(documento) BETWEEN 5 AND 20)
) ENGINE=InnoDB;


-- TIPOS DE VEHICULO (solo moto y carro; tarifa mensual fija)

CREATE TABLE tipos_vehiculos (
  id_tipo_vehiculo TINYINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  codigo           VARCHAR(20)   NOT NULL,
  nombre           VARCHAR(50)   NOT NULL,
  tarifa_mensual   DECIMAL(12,2) NOT NULL,
  activo           BOOLEAN       NOT NULL DEFAULT TRUE,
  fecha_creacion   DATETIME      NOT NULL DEFAULT (UTC_TIMESTAMP()),
  UNIQUE KEY uq_tipo_codigo (codigo),
  CONSTRAINT chk_tipo_codigo CHECK (codigo IN ('moto','carro')),
  CONSTRAINT chk_tipo_tarifa CHECK (tarifa_mensual >= 0)
) ENGINE=InnoDB;


-- CELDAS (bloque = letra; número; tipificada por tipo de vehículo)

CREATE TABLE celdas (
  id_celda         SMALLINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_tipo_vehiculo TINYINT UNSIGNED NOT NULL,
  letra            CHAR(1) NOT NULL,
  numero           SMALLINT UNSIGNED NOT NULL,
  codigo           VARCHAR(8) GENERATED ALWAYS AS
                     (CONCAT(letra,'-',LPAD(numero,2,'0'))) STORED,
  activa           BOOLEAN NOT NULL DEFAULT TRUE,
  en_mantenimiento BOOLEAN NOT NULL DEFAULT FALSE,
  fecha_creacion   DATETIME NOT NULL DEFAULT (UTC_TIMESTAMP()),
  UNIQUE KEY uq_celda_posicion (letra, numero),
  KEY ix_celda_codigo (codigo),
  KEY ix_celda_tipo_activa (id_tipo_vehiculo, activa),
  CONSTRAINT chk_celda_numero CHECK (numero >= 1),
  CONSTRAINT fk_celda_tipo FOREIGN KEY (id_tipo_vehiculo)
    REFERENCES tipos_vehiculos(id_tipo_vehiculo)
) ENGINE=InnoDB;


-- PUERTAS (2 de día; de noche solo la 1)

CREATE TABLE puertas (
  id_puerta           TINYINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre              VARCHAR(30) NOT NULL,
  ubicacion           VARCHAR(100),
  disponible_nocturna BOOLEAN NOT NULL DEFAULT FALSE,
  activa              BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE KEY uq_puerta_nombre (nombre)
) ENGINE=InnoDB;


-- VEHICULOS (placa + propietario + celda fija)

CREATE TABLE vehiculos (
  id_vehiculo                INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_tipo_vehiculo           TINYINT UNSIGNED NOT NULL,
  placa                      VARCHAR(8) NOT NULL,
  color                      VARCHAR(15) NOT NULL DEFAULT '',
  -- Año en que salió el modelo del vehículo (ej. 2021)
  modelo                     VARCHAR(4) NOT NULL DEFAULT '',
  -- Nombre comercial del modelo (ej. 'Toyota Hilux')
  nombre_modelo              VARCHAR(50) NOT NULL DEFAULT '',
  -- Propietario (cliente del parqueadero)
  propietario_nombre         VARCHAR(120) NOT NULL,
  propietario_tipo_documento ENUM('cc','ce','nit','pasaporte') NOT NULL DEFAULT 'cc',
  propietario_documento      VARCHAR(20) NOT NULL,
  propietario_telefono       VARCHAR(20),
  propietario_email          VARCHAR(120),
  -- Celda fija asignada (puede ser NULL mientras se asigna)
  id_celda_fija              SMALLINT UNSIGNED NULL,
  activo                     BOOLEAN NOT NULL DEFAULT TRUE,
  fecha_registro             DATETIME NOT NULL DEFAULT (UTC_TIMESTAMP()),
  UNIQUE KEY uq_vehiculo_placa (placa),
  UNIQUE KEY uq_vehiculo_celda_fija (id_celda_fija), -- NULL repetible
  KEY ix_vehiculo_tipo (id_tipo_vehiculo, activo),
  KEY ix_vehiculo_prop_doc (propietario_tipo_documento, propietario_documento),
  CONSTRAINT chk_vehiculo_placa CHECK (CHAR_LENGTH(placa) BETWEEN 5 AND 8                                 ),
  CONSTRAINT fk_vehiculo_tipo FOREIGN KEY (id_tipo_vehiculo)
    REFERENCES tipos_vehiculos(id_tipo_vehiculo),
  CONSTRAINT fk_vehiculo_celda FOREIGN KEY (id_celda_fija)
    REFERENCES celdas(id_celda)
) ENGINE=InnoDB;


-- TURNOS de caja (uno abierto por operador)

CREATE TABLE turnos (
  id_turno             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_usuario           INT UNSIGNED NOT NULL,
  estado               ENUM('abierto','cerrado') NOT NULL DEFAULT 'abierto',
  fecha_apertura       DATETIME NOT NULL DEFAULT (UTC_TIMESTAMP()),
  base_inicial         DECIMAL(12,2) NOT NULL DEFAULT 0,
  observacion_apertura VARCHAR(255),
  fecha_cierre         DATETIME NULL,
  total_efectivo       DECIMAL(12,2) NULL,
  total_transferencia  DECIMAL(12,2) NULL,
  total_tarjeta        DECIMAL(12,2) NULL,
  total_qr             DECIMAL(12,2) NULL,
  total_general        DECIMAL(12,2) NULL,
  diferencia           DECIMAL(12,2) NULL,
  observacion_cierre   VARCHAR(255),
  -- Un solo turno abierto por usuario (mismo patrón que el resto del esquema)
  usuario_abierto INT UNSIGNED GENERATED ALWAYS AS
    (IF(estado = 'abierto', id_usuario, NULL)) STORED,
  UNIQUE KEY uq_turno_abierto (usuario_abierto),
  KEY ix_turno_usuario_fecha (id_usuario, fecha_apertura),
  CONSTRAINT fk_turno_usuario FOREIGN KEY (id_usuario)
    REFERENCES usuarios(id_usuario)
) ENGINE=InnoDB;


-- MENSUALIDADES (periodo contratado por vehículo)

CREATE TABLE mensualidades (
  id_mensualidad      INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_vehiculo         INT UNSIGNED NOT NULL,
  id_usuario_registro INT UNSIGNED NOT NULL,          -- quién la vendió
  fecha_inicio        DATE NOT NULL,
  fecha_fin           DATE NOT NULL,
  valor               DECIMAL(12,2) NOT NULL,          -- snapshot de tarifa
  estado              ENUM('activa','cancelada') NOT NULL DEFAULT 'activa',
  observaciones       VARCHAR(255),
  fecha_creacion      DATETIME NOT NULL DEFAULT (UTC_TIMESTAMP()),
  UNIQUE KEY uq_mens_vehiculo_inicio (id_vehiculo, fecha_inicio),
  KEY ix_mens_vehiculo_fin (id_vehiculo, estado, fecha_fin),
  KEY ix_mens_estado (estado, fecha_fin),
  CONSTRAINT chk_mens_fechas CHECK (fecha_fin > fecha_inicio),
  CONSTRAINT chk_mens_valor  CHECK (valor > 0),
  CONSTRAINT fk_mens_vehiculo FOREIGN KEY (id_vehiculo)
    REFERENCES vehiculos(id_vehiculo),
  CONSTRAINT fk_mens_usuario  FOREIGN KEY (id_usuario_registro)
    REFERENCES usuarios(id_usuario)
) ENGINE=InnoDB;

-- PAGOS (cada abono/cancelación de una mensualidad, dentro de un turno)

CREATE TABLE pagos (
  id_pago         BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_mensualidad  INT UNSIGNED NOT NULL,
  id_turno        INT UNSIGNED NOT NULL,
  id_usuario      INT UNSIGNED NOT NULL,
  metodo_pago     ENUM('efectivo','transferencia','tarjeta','qr') NOT NULL,
  monto           DECIMAL(12,2) NOT NULL,   -- aplicado al cobro (sin vuelto)
  monto_recibido  DECIMAL(12,2) NOT NULL,   -- lo entregado por el cliente
  referencia      VARCHAR(100),
  fecha_pago      DATETIME NOT NULL DEFAULT (UTC_TIMESTAMP()),
  KEY ix_pago_mens  (id_mensualidad),
  KEY ix_pago_turno (id_turno, metodo_pago),
  KEY ix_pago_fecha (fecha_pago),
  CONSTRAINT chk_pago_montos CHECK (monto > 0 AND monto_recibido >= monto),
  CONSTRAINT fk_pago_mens  FOREIGN KEY (id_mensualidad) REFERENCES mensualidades(id_mensualidad),
  CONSTRAINT fk_pago_turno FOREIGN KEY (id_turno)       REFERENCES turnos(id_turno),
  CONSTRAINT fk_pago_usr   FOREIGN KEY (id_usuario)     REFERENCES usuarios(id_usuario)
) ENGINE=InnoDB;


-- ACCESOS (ingreso → salida del vehículo; sin cobro, es solo bitácora)

CREATE TABLE accesos_vehiculos (
  id_acceso           BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_vehiculo         INT UNSIGNED NOT NULL,
  id_celda            SMALLINT UNSIGNED NOT NULL,       -- toma de vehiculos.id_celda_fija al ingresar
  id_puerta_ingreso   TINYINT UNSIGNED NOT NULL,
  id_puerta_salida    TINYINT UNSIGNED NULL,
  id_operador_ingreso INT UNSIGNED NOT NULL,
  id_operador_salida  INT UNSIGNED NULL,
  id_turno_ingreso    INT UNSIGNED NOT NULL,
  id_turno_salida     INT UNSIGNED NULL,
  fecha_ingreso       DATETIME NOT NULL DEFAULT (UTC_TIMESTAMP()),
  fecha_salida        DATETIME NULL,
  observacion         VARCHAR(255),
  -- Un vehículo dentro a la vez; una celda ocupada a la vez
  vehiculo_dentro INT UNSIGNED GENERATED ALWAYS AS
    (IF(fecha_salida IS NULL, id_vehiculo, NULL)) STORED,
  celda_ocupada   SMALLINT UNSIGNED GENERATED ALWAYS AS
    (IF(fecha_salida IS NULL, id_celda, NULL)) STORED,
  UNIQUE KEY uq_acceso_vehiculo_dentro (vehiculo_dentro),
  UNIQUE KEY uq_acceso_celda_ocupada   (celda_ocupada),
  KEY ix_acceso_vehiculo (id_vehiculo, fecha_ingreso),
  KEY ix_acceso_celda    (id_celda, fecha_ingreso),
  KEY ix_acceso_turno    (id_turno_ingreso),
  CONSTRAINT chk_acceso_fechas CHECK (fecha_salida IS NULL OR fecha_salida >= fecha_ingreso),
  CONSTRAINT fk_acceso_vehiculo FOREIGN KEY (id_vehiculo)         REFERENCES vehiculos(id_vehiculo),
  CONSTRAINT fk_acceso_celda    FOREIGN KEY (id_celda)            REFERENCES celdas(id_celda),
  CONSTRAINT fk_acceso_puerta_i FOREIGN KEY (id_puerta_ingreso)   REFERENCES puertas(id_puerta),
  CONSTRAINT fk_acceso_puerta_s FOREIGN KEY (id_puerta_salida)    REFERENCES puertas(id_puerta),
  CONSTRAINT fk_acceso_op_i     FOREIGN KEY (id_operador_ingreso) REFERENCES usuarios(id_usuario),
  CONSTRAINT fk_acceso_op_s     FOREIGN KEY (id_operador_salida)  REFERENCES usuarios(id_usuario),
  CONSTRAINT fk_acceso_turno_i  FOREIGN KEY (id_turno_ingreso)    REFERENCES turnos(id_turno),
  CONSTRAINT fk_acceso_turno_s  FOREIGN KEY (id_turno_salida)     REFERENCES turnos(id_turno)
) ENGINE=InnoDB;


-- NOVEDADES (incidentes)

CREATE TABLE novedades (
  id_novedad     BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_vehiculo    INT UNSIGNED NOT NULL,
  id_acceso      BIGINT UNSIGNED NULL,
  id_operador    INT UNSIGNED NOT NULL,
  tipo           ENUM('accidente','daño','robo','observacion','otro')
                   NOT NULL DEFAULT 'observacion',
  descripcion    VARCHAR(500) NOT NULL,
  fecha          DATETIME NOT NULL DEFAULT (UTC_TIMESTAMP()),
  fecha_creacion DATETIME NOT NULL DEFAULT (UTC_TIMESTAMP()),
  KEY ix_novedad_vehiculo (id_vehiculo, fecha),
  KEY ix_novedad_operador (id_operador),
  CONSTRAINT fk_novedad_vehiculo FOREIGN KEY (id_vehiculo) REFERENCES vehiculos(id_vehiculo),
  CONSTRAINT fk_novedad_acceso   FOREIGN KEY (id_acceso)   REFERENCES accesos_vehiculos(id_acceso),
  CONSTRAINT fk_novedad_operador FOREIGN KEY (id_operador) REFERENCES usuarios(id_usuario)
) ENGINE=InnoDB;


-- LOGIN ATTEMPTS (anti fuerza bruta para admin/operador)

CREATE TABLE login_attempts (
  id_intento    BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  usuario_login VARCHAR(40) NOT NULL,
  exitoso       BOOLEAN NOT NULL,
  ip_address    VARCHAR(45) NOT NULL,
  fecha_intento DATETIME NOT NULL DEFAULT (UTC_TIMESTAMP()),
  KEY ix_la_usuario (usuario_login, fecha_intento),
  KEY ix_la_ip      (ip_address, fecha_intento)
) ENGINE=InnoDB;

USE autos_colombia;

SELECT *
FROM vehiculos;
