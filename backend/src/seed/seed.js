//backend/src/seeds/seed.js
import bcrypt from "bcryptjs";
import { pool } from "../config/db.js";
import { MODELOS_POR_TIPO, COLORES } from "./catalogoVehiculos.js";

const TABLAS = [
  "pagos",
  "novedades",
  "accesos_vehiculos",
  "mensualidades",
  "turnos",
  "login_attempts",
  "refresh_tokens",
  "revoked_tokens",
  "audit_log",
  "vehiculos",
  "celdas",
  "puertas",
  "tipos_vehiculos",
  "usuarios",
];

const NOMBRES = ["Carlos", "Maria", "Juan", "Ana", "Luis", "Pedro", "Laura", "Diego", "Sofia", "Andres", "Elena", "Jorge"];
const APELLIDOS = ["Perez", "Rodriguez", "Martinez", "Gonzalez", "Diaz", "Lopez", "Ramirez", "Castro", "Gomez", "Silva", "Torres", "Ruiz"];
const ROLES_VALIDOS = ["administrador", "operador"];

const placaCarro = (n) => `CAR${String(n).padStart(3, "0")}`;
const placaMoto = (n) => `MOT${String(n).padStart(2, "0")}A`;

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

async function crearUsuarios(conn) {
  const usuarios = [];
  
  // 1. Admin principal (siempre presente)
  usuarios.push([
    "administrador", "cc", "1000000000", "Administrador", "Principal",
    "3000000000", "admin@autoscolombia.com", "admin",
    await bcrypt.hash("123456", 10)
  ]);
  
  // 2. Operador principal (siempre presente)
  usuarios.push([
    "operador", "cc", "1000000001", "Operador", "Principal",
    "3000000001", "operador@autoscolombia.com", "operador",
    await bcrypt.hash("123456", 10)
  ]);

  // 3. 10 usuarios adicionales alternando roles válidos
  for (let i = 0; i < 10; i++) {
    const rol = ROLES_VALIDOS[i % ROLES_VALIDOS.length];
    const idx = i + 2; // índice global 2..11
    const nombre = NOMBRES[idx % NOMBRES.length];
    const apellido = APELLIDOS[idx % APELLIDOS.length];
    const usuarioLogin = `${rol.substring(0, 3)}${idx + 1}`;
    usuarios.push([
      rol, "cc", String(1000000000 + idx),
      nombre, apellido,
      `300${String(idx).padStart(7, "0")}`,
      `${nombre.toLowerCase()}.${apellido.toLowerCase()}${idx}@autoscolombia.com`,
      usuarioLogin,
      await bcrypt.hash("123456", 10)
    ]);
  }

  await conn.query(
    `INSERT INTO usuarios (rol, tipo_documento, documento, nombres, apellidos, telefono, email, usuario_login, clave_hash) 
     VALUES ?`,
    [usuarios]
  );
  console.log("Usuarios staff creados: 12 (1 admin + 1 operador principal + 10 adicionales)");
}

async function main() {
  const reset = process.argv.includes("--reset");
  const conn = await pool.getConnection();
  try {
    if (reset) {
      await vaciarBase(conn);
    } else {
      const [checks] = await conn.query("SELECT COUNT(*) as count FROM usuarios");
      if (Number(checks[0].count) > 0) {
        console.log("La base ya tiene datos.");
        return;
      }
    }

    await conn.beginTransaction();

    await crearUsuarios(conn);

    // 1. Tipos de vehiculo
    await conn.query(
      `INSERT INTO tipos_vehiculos (codigo, nombre, tarifa_mensual)
       VALUES ('carro', 'Carro', 250000), ('moto', 'Moto', 100000)`
    );
    const [tipos] = await conn.query("SELECT id_tipo_vehiculo, codigo FROM tipos_vehiculos");
    const idTipoCarro = tipos.find((t) => t.codigo === "carro").id_tipo_vehiculo;
    const idTipoMoto = tipos.find((t) => t.codigo === "moto").id_tipo_vehiculo;

    // 2. Puertas
    await conn.query(
      `INSERT INTO puertas (nombre, ubicacion, disponible_nocturna, activa)
       VALUES ('Puerta 1', 'Principal', TRUE, TRUE), ('Puerta 2', 'Secundaria', FALSE, TRUE)`
    );

    // 3. Celdas
    const celdas = [];
    for (const letra of ["A", "B", "C", "D", "E", "F", "G"]) {
      for (let n = 1; n <= 10; n++) celdas.push([idTipoCarro, letra, n]);
    }
    for (let n = 1; n <= 10; n++) celdas.push([idTipoMoto, "H", n]);
    await conn.query("INSERT INTO celdas (id_tipo_vehiculo, letra, numero) VALUES ?", [celdas]);

    // 4. Vehiculos y Propietarios (algunos con doble vehiculo)
    const vehiculos = [];
    const propietarios = [];
    for (let i = 0; i < 50; i++) {
        propietarios.push({
            nombre: `${NOMBRES[i % NOMBRES.length]} ${APELLIDOS[i % APELLIDOS.length]}`,
            doc: String(2000000000 + i),
            tel: `310${String(i).padStart(7, "0")}`,
            email: `cliente${i}@email.com`
        });
    }

    // 70 carros y 10 motos
    for (let i = 1; i <= 70; i++) {
      const owner = propietarios[i % propietarios.length];
      vehiculos.push([
        idTipoCarro, placaCarro(i), COLORES[i % COLORES.length], MODELOS_POR_TIPO.carro[i % MODELOS_POR_TIPO.carro.length].anio,
        MODELOS_POR_TIPO.carro[i % MODELOS_POR_TIPO.carro.length].nombre,
        owner.nombre, "cc", owner.doc, owner.tel, owner.email, true
      ]);
    }
    for (let i = 1; i <= 10; i++) {
      const owner = propietarios[i % propietarios.length];
      vehiculos.push([
        idTipoMoto, placaMoto(i), COLORES[i % COLORES.length], MODELOS_POR_TIPO.moto[i % MODELOS_POR_TIPO.moto.length].anio,
        MODELOS_POR_TIPO.moto[i % MODELOS_POR_TIPO.moto.length].nombre,
        owner.nombre, "cc", owner.doc, owner.tel, owner.email, true
      ]);
    }
    await conn.query(
      `INSERT INTO vehiculos (id_tipo_vehiculo, placa, color, modelo, nombre_modelo, propietario_nombre, propietario_tipo_documento, propietario_documento, propietario_telefono, propietario_email, activo) VALUES ?`,
      [vehiculos]
    );

    // 5. Mensualidades (incrementadas)
    const [filas] = await conn.query("SELECT id_vehiculo FROM vehiculos");
    const [usuarios] = await conn.query("SELECT id_usuario FROM usuarios WHERE rol='operador' LIMIT 1");
    const idOperador = usuarios[0].id_usuario;

    const hoy = new Date();
    const fin = new Date(hoy); fin.setMonth(fin.getMonth() + 1);
    
    const mensualidades = [];
    // Asignar mensualidad a 30 vehiculos
    for(let i=0; i<30; i++) {
        mensualidades.push([
            filas[i].id_vehiculo, idOperador, ymd(hoy), ymd(fin), i < 25 ? 250000 : 100000, "activa"
        ]);
    }
    await conn.query(
      `INSERT INTO mensualidades (id_vehiculo, id_usuario_registro, fecha_inicio, fecha_fin, valor, estado) VALUES ?`,
      [mensualidades]
    );

    await conn.commit();
    console.log("Seed completado.");
  } catch (err) {
    await conn.rollback();
    console.error(err);
  } finally {
    await conn.release();
    await pool.end();
  }
}

main();
