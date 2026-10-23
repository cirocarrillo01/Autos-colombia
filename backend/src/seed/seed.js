// backend/src/seeds/seed.js
// Datos iniciales para probar ingreso y salida (la base se crea antes con
// Script/parqueadero.sql, que no se modifica).
//
//   - 2 tipos de vehiculo: carro (250.000) y moto (100.000)
//   - 2 puertas (la puerta 1 es la que usa el backend)
//   - 80 celdas: 70 de carro (A-G) y 10 de moto (H)
//   - 1 operador (usuario: operador / clave: 123456)
//   - 80 vehiculos: CAR001..CAR070 y MOT01A..MOT10A
//   - Mensualidades: al dia (CAR001-005, MOT01A-08A), en mora (CAR006, MOT09A);
//     el resto queda sin mensualidad
//
// Uso (desde backend/):
//   npm run seed         -> siembra solo si la base esta vacia
//   npm run seed:reset   -> vacia las tablas y siembra de nuevo

import bcrypt from "bcryptjs";
import { pool } from "../config/db.js";
import { MODELOS_POR_TIPO, COLORES } from "./catalogoVehiculos.js";

// Orden de borrado respetando las claves foraneas
const TABLAS = [
  "pagos",
  "novedades",
  "accesos_vehiculos",
  "mensualidades",
  "turnos",
  "login_attempts",
  "vehiculos",
  "celdas",
  "puertas",
  "tipos_vehiculos",
  "usuarios",
];

const NOMBRES = [
  "Carlos",
  "Maria",
  "Juan",
  "Ana",
  "Luis",
  "Pedro",
  "Laura",
  "Diego",
  "Sofia",
  "Andres",
];
const APELLIDOS = [
  "Perez",
  "Rodriguez",
  "Martinez",
  "Gonzalez",
  "Diaz",
  "Lopez",
  "Ramirez",
  "Castro",
  "Gomez",
  "Silva",
];

const placaCarro = (n) => `CAR${String(n).padStart(3, "0")}`;
const placaMoto = (n) => `MOT${String(n).padStart(2, "0")}A`;

// YYYY-MM-DD con fecha local (toISOString puede adelantar un dia por la zona horaria)
const ymd = (f) =>
  `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, "0")}-${String(f.getDate()).padStart(2, "0")}`;

async function vaciarBase(conn) {
  await conn.query("SET FOREIGN_KEY_CHECKS = 0");
  try {
    for (const tabla of TABLAS) await conn.query(`TRUNCATE TABLE \`${tabla}\``);
  } finally {
    await conn.query("SET FOREIGN_KEY_CHECKS = 1");
  }
}

// Fila de la tabla vehiculos (el propietario va integrado en la misma tabla)
const filaVehiculo = ({
  idTipo,
  placa,
  i,
  baseDoc,
  prefijoTel,
  modelo,
  color,
}) => [
  idTipo,
  placa,
  color,
  modelo.anio,
  modelo.nombre,
  `${NOMBRES[(i - 1) % 10]} ${APELLIDOS[(i - 1) % 10]}`,
  "cc",
  String(baseDoc + ((i - 1) % 10)),
  `${prefijoTel}${String(i).padStart(7, "0")}`,
  `${NOMBRES[(i - 1) % 10].toLowerCase()}.${APELLIDOS[(i - 1) % 10].toLowerCase()}@email.com`,
  null, // id_celda_fija
  true,
];

async function main() {
  const reset = process.argv.includes("--reset");
  const conn = await pool.getConnection();
  try {
    if (reset) {
      console.log("Modo --reset: se vacian todas las tablas...");
      await vaciarBase(conn);
    }

    const [[{ total }]] = await conn.query(
      "SELECT COUNT(*) AS total FROM tipos_vehiculos",
    );
    if (total > 0) {
      console.log(
        "La base ya tiene datos. Usa `npm run seed:reset` para volver a sembrar.",
      );
      return;
    }

    await conn.beginTransaction();

    // 1. Tipos de vehiculo
    await conn.query(
      `INSERT INTO tipos_vehiculos (codigo, nombre, tarifa_mensual)
       VALUES ('carro', 'Carro', 250000), ('moto', 'Moto', 100000)`,
    );
    const [tipos] = await conn.query(
      "SELECT id_tipo_vehiculo, codigo FROM tipos_vehiculos",
    );
    const idTipoCarro = tipos.find(
      (t) => t.codigo === "carro",
    ).id_tipo_vehiculo;
    const idTipoMoto = tipos.find((t) => t.codigo === "moto").id_tipo_vehiculo;
    console.log("Tipos de vehiculo creados");

    // 2. Puertas (accesos_vehiculos exige una puerta de ingreso)
    await conn.query(
      `INSERT INTO puertas (nombre, ubicacion, disponible_nocturna, activa)
       VALUES ('Puerta 1', 'Principal', TRUE, TRUE),
              ('Puerta 2', 'Secundaria', FALSE, TRUE)`,
    );
    console.log("Puertas creadas: 2");

    // 3. Celdas: 70 de carro (A-G x 10) y 10 de moto (H x 10)
    const celdas = [];
    for (const letra of ["A", "B", "C", "D", "E", "F", "G"]) {
      for (let n = 1; n <= 10; n++) celdas.push([idTipoCarro, letra, n]);
    }
    for (let n = 1; n <= 10; n++) celdas.push([idTipoMoto, "H", n]);
    await conn.query(
      "INSERT INTO celdas (id_tipo_vehiculo, letra, numero) VALUES ?",
      [celdas],
    );
    console.log(`Celdas creadas: ${celdas.length}`);

    // 4. Operador (el backend lo usa para registrar los movimientos)
    const [operador] = await conn.query(
      `INSERT INTO usuarios
         (rol, tipo_documento, documento, nombres, apellidos, telefono, email, usuario_login, clave_hash)
       VALUES ('operador', 'cc', '1000000000', 'Operador', 'Principal',
               '3000000000', 'operador@autoscolombia.com', 'operador', ?)`,
      [await bcrypt.hash("123456", 10)],
    );
    const idOperador = operador.insertId;
    console.log("Operador creado: usuario=operador, clave=123456");

    // 5. Vehiculos
    const vehiculos = [];
    const { carro, moto } = MODELOS_POR_TIPO;
    for (let i = 1; i <= 70; i++) {
      vehiculos.push(
        filaVehiculo({
          idTipo: idTipoCarro,
          placa: placaCarro(i),
          i,
          baseDoc: 1000000000,
          prefijoTel: "300",
          modelo: carro[(i - 1) % carro.length],
          color: COLORES[(i - 1) % COLORES.length],
        }),
      );
    }
    for (let i = 1; i <= 10; i++) {
      vehiculos.push(
        filaVehiculo({
          idTipo: idTipoMoto,
          placa: placaMoto(i),
          i,
          baseDoc: 2000000000,
          prefijoTel: "310",
          modelo: moto[(i - 1) % moto.length],
          color: COLORES[(i - 1) % COLORES.length],
        }),
      );
    }
    await conn.query(
      `INSERT INTO vehiculos (
         id_tipo_vehiculo, placa, color, modelo, nombre_modelo,
         propietario_nombre, propietario_tipo_documento, propietario_documento,
         propietario_telefono, propietario_email, id_celda_fija, activo
       ) VALUES ?`,
      [vehiculos],
    );
    console.log(`Vehiculos creados: ${vehiculos.length}`);

    // 6. Mensualidades de prueba (al dia / en mora / sin mensualidad)
    const [filas] = await conn.query(
      "SELECT id_vehiculo, placa FROM vehiculos",
    );
    const idPorPlaca = Object.fromEntries(
      filas.map((f) => [f.placa, f.id_vehiculo]),
    );

    const hoy = new Date();
    const inicio = new Date(hoy);
    inicio.setMonth(inicio.getMonth() - 1);
    const fin = new Date(hoy);
    fin.setMonth(fin.getMonth() + 1);
    const vencida = new Date(hoy);
    vencida.setDate(vencida.getDate() - 10);

    const plan = [
      ...[1, 2, 3, 4, 5].map((n) => [placaCarro(n), fin, 250000]),
      [placaCarro(6), vencida, 250000],
      ...[1, 2, 3, 4, 5, 6, 7, 8].map((n) => [placaMoto(n), fin, 100000]),
      [placaMoto(9), vencida, 100000],
    ];
    const mensualidades = plan.map(([placa, fechaFin, valor]) => [
      idPorPlaca[placa],
      idOperador,
      ymd(inicio),
      ymd(fechaFin),
      valor,
      "activa",
    ]);
    await conn.query(
      `INSERT INTO mensualidades
         (id_vehiculo, id_usuario_registro, fecha_inicio, fecha_fin, valor, estado)
       VALUES ?`,
      [mensualidades],
    );
    console.log(`Mensualidades creadas: ${mensualidades.length}`);

    await conn.commit();
    console.log("Seed completado.");
  } catch (err) {
    await conn.rollback();
    console.error("Error durante el seed:", err.message);
    process.exitCode = 1;
  } finally {
    conn.release();
    await pool.end();
  }
}

main();
