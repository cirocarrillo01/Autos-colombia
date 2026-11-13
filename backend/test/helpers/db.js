// backend/test/helpers/db.js
import mysql from 'mysql2/promise';

// Configuración para la base de datos de pruebas.
// Nota: Asegúrate de tener la base de datos 'autos_colombia_test' creada en tu MySQL.
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'ciro97110',
  database: 'autos_colombia_test',
  multipleStatements: true,
};

/**
 * Limpia las tablas respetando el orden de las llaves foráneas (FK).
 */
export const clearTables = async () => {
  const connection = await mysql.createConnection(dbConfig);
  try {
    await connection.query('SET FOREIGN_KEY_CHECKS = 0;');
    await connection.query('DELETE FROM accesos_vehiculos;');
    await connection.query('DELETE FROM pagos;');
    await connection.query('DELETE FROM mensualidades;');
    await connection.query('DELETE FROM vehiculos;');
    await connection.query('DELETE FROM turnos;');
    await connection.query('DELETE FROM puertas;');
    await connection.query('DELETE FROM celdas;');
    await connection.query('DELETE FROM usuarios;');
    await connection.query('DELETE FROM tipos_vehiculos;');
    await connection.query('SET FOREIGN_KEY_CHECKS = 1;');
  } finally {
    await connection.end();
  }
};

/**
 * Inserta datos de prueba requeridos por el Plan de Pruebas.
 */
export const seedTestDB = async () => {
  const connection = await mysql.createConnection(dbConfig);
  try {
    // 1. Tipos de vehículos
    await connection.query(`
      INSERT INTO tipos_vehiculos (id_tipo_vehiculo, nombre, codigo, tarifa_mensual) VALUES 
      (1, 'Carro', 'carro', 100000), 
      (2, 'Moto', 'moto', 50000);
    `);

    // 2. Usuarios de prueba (clave: 123456)
    await connection.query(`
      INSERT INTO usuarios (id_usuario, usuario_login, clave_hash, rol, tipo_documento, documento, nombres, apellidos, estado) VALUES 
      (1, 'admin', '$2a$10$cgabXbsvaFBd/7o7qAye7.vVvlZMRksyIKY5MJSLSTDD6wnTZK7am', 'administrador', 'cc', '12345', 'Admin', 'Pruebas', 'activo'),
      (2, 'administrador', '$2a$10$cgabXbsvaFBd/7o7qAye7.vVvlZMRksyIKY5MJSLSTDD6wnTZK7am', 'administrador', 'cc', '12346', 'Admin', 'Dos', 'activo'),
      (3, 'operador', '$2a$10$cgabXbsvaFBd/7o7qAye7.vVvlZMRksyIKY5MJSLSTDD6wnTZK7am', 'operador', 'cc', '54321', 'Operador', 'Prueba', 'activo'),
      (4, 'operador_prueba', '$2a$10$cgabXbsvaFBd/7o7qAye7.vVvlZMRksyIKY5MJSLSTDD6wnTZK7am', 'operador', 'cc', '54322', 'Operador', 'Prueba2', 'activo');
    `);

    // 3. Puertas
    await connection.query(`
      INSERT INTO puertas (id_puerta, nombre, activa) VALUES 
      (1, 'P1', TRUE),
      (2, 'P2', TRUE);
    `);

    // 4. Turnos
    await connection.query(`
      INSERT INTO turnos (id_turno, id_usuario, estado, base_inicial) VALUES 
      (1, 1, 'abierto', 0),
      (2, 2, 'abierto', 0);
    `);

    // 5. Vehículos de prueba (IDs fijos para consistencia en tests)
    await connection.query(`
      INSERT INTO vehiculos (id_vehiculo, placa, id_tipo_vehiculo, color, modelo, nombre_modelo, propietario_nombre, propietario_tipo_documento, propietario_documento, activo) VALUES 
      (1, 'CAR002', 1, 'Rojo', '2020', 'Spark', 'Juan Perez', 'cc', '12345', TRUE),
      (2, 'CAR003', 1, 'Azul', '2021', 'Kwid', 'Juan Perez', 'cc', '12345', TRUE),
      (3, 'MOT001', 2, 'Negro', '2022', 'CB125', 'Maria Gomez', 'cc', '54321', TRUE),
      (4, 'CAR001', 1, 'Blanco', '2020', 'Spark', 'Juan Perez', 'cc', '12345', TRUE),
      (5, 'CAR006', 1, 'Gris', '2021', 'Kwid', 'Juan Perez', 'cc', '12345', TRUE),
      (6, 'CAR007', 1, 'Verde', '2020', 'Spark', 'Juan Perez', 'cc', '12345', TRUE);
    `);

    // 6. Mensualidades de prueba
    await connection.query(`
      INSERT INTO mensualidades (id_mensualidad, id_vehiculo, id_usuario_registro, fecha_inicio, fecha_fin, valor, estado) VALUES 
      (1, 1, 1, '2020-01-01', '2099-12-31', 100000, 'activa'),
      (2, 2, 1, '2020-01-01', '2099-12-31', 100000, 'activa'),
      (3, 3, 1, '2020-01-01', '2099-12-31', 50000, 'activa'),
      (4, 4, 1, '2020-01-01', '2099-12-31', 100000, 'activa'),
      (5, 5, 1, '2020-01-01', '2022-01-01', 100000, 'activa');
    `);

    // 7. Celdas de prueba
    await connection.query(`
      INSERT INTO celdas (id_celda, id_tipo_vehiculo, letra, numero, activa, en_mantenimiento) VALUES 
      (1, 1, 'B', 1, TRUE, FALSE),
      (2, 1, 'B', 2, TRUE, FALSE),
      (3, 1, 'B', 3, TRUE, FALSE),
      (4, 1, 'B', 4, TRUE, FALSE),
      (5, 1, 'B', 5, TRUE, FALSE),
      (6, 1, 'B', 6, TRUE, FALSE),
      (7, 1, 'B', 7, TRUE, FALSE),
      (8, 1, 'B', 8, TRUE, FALSE),
      (9, 1, 'B', 9, TRUE, FALSE),
      (10, 1, 'B', 10, TRUE, FALSE),
      (11, 2, 'C', 1, TRUE, FALSE);
    `);
  } finally {
    await connection.end();
  }
};

/**
 * Prepara el entorno antes de cada test.
 */
export const setupTestDB = async () => {
  await clearTables();
  await seedTestDB();
};
