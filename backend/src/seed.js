// backend/src/seed.js

// ============================================================================
// SEED - DATOS INICIALES (MySQL nativo)
// ============================================================================
// Genera los datos necesarios para probar ingreso y salida:
//   - 2 tipos de vehículo: carro (250.000) y moto (100.000)
//   - 2 puertas (la puerta 1 es la que usa el backend por defecto)
//   - 80 celdas: 70 de carro (bloques A-G) y 10 de moto (bloque H)
//   - 5 usuarios representativos (roles y estados distintos), ver USUARIOS_SEED
//   - 80 vehículos: 70 carros (CAR001..CAR070) y 10 motos (MOT01A..MOT10A)
//
// Formatos de placa (ver src/validators/placa.js):
//   - Carro: AAA###  (CAR001, CAR-001)
//   - Moto:  AAA##X  (MOT01A, MOT-01A)
//
// Cómo ejecutar (desde backend/):
//   npm run seed            -> siembra solo lo que falta (no destructivo)
//   npm run seed -- --reset -> vacía las tablas y vuelve a sembrar desde cero
//
// Requisitos:
//   - Base 'autos_colombia' creada con Script/parqueadero.sql
//   - Credenciales de MySQL en backend/.env (DB_HOST, DB_USER, DB_PASSWORD...)
//
// Comportamiento:
//   - Sin --reset: conserva todos los registros existentes, completa modelo/color
//     de los vehículos que lo tengan vacío, migra placas de moto con formato
//     antiguo (MOT001 -> MOT01A) y agrega los usuarios que falten.
//   - Con --reset: borra el contenido de todas las tablas (en orden seguro con
//     las claves foráneas) y ejecuta la siembra completa.
// ============================================================================

import bcrypt from "bcryptjs";
import { pool } from "./config/db.js"; // db.js importa envLoader.js, que carga el .env
import { esPlacaValida } from "./validators/placa.js";
import {
  MODELOS_POR_TIPO,
  COLORES,
  numeroDePlaca,
  modeloAnioColorDe,
  anioDeModelo,
} from "./config/catalogoVehiculos.js";

// Catálogo de usuarios representativos.
// Cada usuario tiene un rol (administrador/operador) y un estado (activo/inactivo)
// distinto, para poder probar el login, el bloqueo por usuario inactivo (403) y
// la selección del operador por defecto en el registro de movimientos.
// La clave de todos es "123456" (hash bcrypt con 10 rondas).
const USUARIOS_SEED = [
  {
    rol: "administrador",
    tipo_documento: "cc",
    documento: "1000000001",
    nombres: "Ana",
    apellidos: "Restrepo Admin",
    telefono: "3001110001",
    email: "admin@autoscolombia.com",
    usuario_login: "admin",
    clave: "123456",
    estado: "activo",
  },
  {
    rol: "operador",
    tipo_documento: "cc",
    documento: "1000000000",
    nombres: "Operador",
    apellidos: "Principal",
    telefono: "3000000000",
    email: "operador@autoscolombia.com",
    usuario_login: "operador",
    clave: "123456",
    estado: "activo",
  },
  {
    rol: "operador",
    tipo_documento: "ce",
    documento: "E1234567",
    nombres: "Lucia",
    apellidos: "Mendoza",
    telefono: "3012220002",
    email: "lucia.mendoza@autoscolombia.com",
    usuario_login: "lucia",
    clave: "123456",
    estado: "activo",
  },
  {
    rol: "operador",
    tipo_documento: "cc",
    documento: "1000000003",
    nombres: "Carlos",
    apellidos: "Turnos",
    telefono: "3023330003",
    email: "carlos.turnos@autoscolombia.com",
    usuario_login: "carlos",
    clave: "123456",
    estado: "inactivo",
  },
  {
    rol: "administrador",
    tipo_documento: "nit",
    documento: "900123456-1",
    nombres: "Marta",
    apellidos: "Administracion",
    telefono: "3034440004",
    email: "marta.admin@autoscolombia.com",
    usuario_login: "marta",
    clave: "123456",
    estado: "inactivo",
  },
];

// Placa de moto con el formato vigente (AAA##X): MOT001 -> MOT01A, MOT010 -> MOT10A.
// El número se conserva para poder mapear una placa antigua con su equivalente.
const placaMoto = (numero) => `MOT${String(numero).padStart(2, "0")}A`;

// Placa de carro con el formato vigente (AAA###).
const placaCarro = (numero) => `CAR${String(numero).padStart(3, "0")}`;

// Sincroniza modelo/año/color de los vehículos que los tengan incompletos.
// En el esquema vigente:
//   - `modelo`        -> AÑO de lanzamiento (VARCHAR(4), ej. "2021")
//   - `nombre_modelo` -> nombre comercial (VARCHAR(50), ej. "Toyota Hilux")
//   - `color`         -> color de la carrocería
//
// Es idempotente: solo actualiza las filas incompletas y no toca ningún otro
// dato, así que se puede usar para completar una base ya sembrada.
// Detecta también el esquema anterior (modelo con el nombre comercial) y lo
// convierte: mueve el nombre a `nombre_modelo` y deja el año en `modelo`.
async function sincronizarModeloColor(conn) {
  const [columnas] = await conn.query(
    "SELECT COLUMN_NAME AS c FROM information_schema.COLUMNS " +
      "WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'vehiculos'",
  );
  const nombresColumna = new Set(columnas.map((c) => c.c));
  if (!nombresColumna.has("nombre_modelo")) return 0;

  const [filas] = await conn.query(
    `SELECT v.id_vehiculo, v.placa, v.modelo, v.nombre_modelo, v.color,
            tv.codigo AS tipo_codigo
     FROM vehiculos v
     INNER JOIN tipos_vehiculos tv ON tv.id_tipo_vehiculo = v.id_tipo_vehiculo
     WHERE v.modelo = '' OR v.nombre_modelo = '' OR v.color = ''`,
  );
  if (filas.length === 0) return 0;

  for (const f of filas) {
    const catalogo = modeloAnioColorDe(f.tipo_codigo, f.placa);
    // Si `modelo` aún guarda el nombre comercial (esquema viejo), se conserva
    // como `nombre_modelo` y el año se calcula con el catálogo.
    const modeloEsAnio = /^\d{4}$/.test(f.modelo ?? "");
    const nombre =
      f.nombre_modelo?.trim() ||
      (!modeloEsAnio && f.modelo?.trim()) ||
      catalogo.modelo;
    const anio = modeloEsAnio ? f.modelo : anioDeModelo(nombre);
    const color = f.color?.trim() || catalogo.color;

    await conn.query(
      "UPDATE vehiculos SET modelo = ?, nombre_modelo = ?, color = ? WHERE id_vehiculo = ?",
      [anio, nombre, color, f.id_vehiculo],
    );
  }
  return filas.length;
}

// Tablas del esquema en el orden de borrado (de las que dependen a las que
// dependen). "movimientos" es la tabla auxiliar de initDb.js y no tiene FKs.
const TABLAS_SEED = [
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
  "movimientos",
];

// Vacía todas las tablas del esquema (usado por --reset).
// Se desactivan las FKs para poder borrar en un solo paso y se reactivan al final.
async function vaciarBase(conn) {
  const [existentes] = await conn.query(
    "SELECT TABLE_NAME AS t FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE()",
  );
  const nombres = new Set(existentes.map((r) => r.t));
  await conn.query("SET FOREIGN_KEY_CHECKS = 0");
  try {
    for (const tabla of TABLAS_SEED) {
      if (!nombres.has(tabla)) continue;
      await conn.query(`TRUNCATE TABLE \`${tabla}\``);
    }
  } finally {
    await conn.query("SET FOREIGN_KEY_CHECKS = 1");
  }
  return TABLAS_SEED.filter((t) => nombres.has(t)).length;
}

// Migra las placas de moto que usan el formato antiguo (MOT001) al formato
// vigente (MOT01A). Es idempotente y no toca las placas ya válidas.
async function sincronizarPlacasMoto(conn) {
  const [motos] = await conn.query(
    `SELECT v.id_vehiculo, v.placa
     FROM vehiculos v
     INNER JOIN tipos_vehiculos tv ON tv.id_tipo_vehiculo = v.id_tipo_vehiculo
     WHERE tv.codigo = 'moto'`,
  );
  const [todas] = await conn.query("SELECT placa FROM vehiculos");
  const libres = new Set(todas.map((r) => r.placa));

  let actualizadas = 0;
  for (const m of motos) {
    if (esPlacaValida(m.placa, "moto")) continue;
    const nueva = placaMoto(numeroDePlaca(m.placa));
    if (libres.has(nueva)) continue; // colisión: se deja la placa original
    await conn.query("UPDATE vehiculos SET placa = ? WHERE id_vehiculo = ?", [
      nueva,
      m.id_vehiculo,
    ]);
    libres.delete(m.placa);
    libres.add(nueva);
    actualizadas++;
  }
  return actualizadas;
}

// Agrega los usuarios del catálogo que aún no existan (sin tocar los que ya
// están, para no perder usuarios creados a mano).
async function sincronizarUsuarios(conn) {
  const [existentes] = await conn.query(
    "SELECT usuario_login FROM usuarios",
  );
  const logins = new Set(existentes.map((u) => u.usuario_login));

  const creados = [];
  for (const u of USUARIOS_SEED) {
    if (logins.has(u.usuario_login)) continue;
    const hash = await bcrypt.hash(u.clave, 10);
    await conn.query(
      `INSERT INTO usuarios
         (rol, tipo_documento, documento, nombres, apellidos, telefono,
          email, usuario_login, clave_hash, estado)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        u.rol,
        u.tipo_documento,
        u.documento,
        u.nombres,
        u.apellidos,
        u.telefono,
        u.email,
        u.usuario_login,
        hash,
        u.estado,
      ],
    );
    logins.add(u.usuario_login);
    creados.push(u.usuario_login);
  }
  return creados;
}

// -----------------------------------------------------------------------
// MENSUALIDADES DE PRUEBA
//
// "Al día" / "En mora" / "Sin mensualidad" se DERIVAN de CURRENT_DATE vs
// fecha_fin, así que las fechas se calculan siempre a partir de hoy:
//   - Al día      -> CAR001..CAR005 y MOT01A..MOT08A
//   - En mora     -> CAR006 y MOT09A
//   - Sin mensual -> CAR007..CAR070 y MOT10A
//
// Es idempotente: no inserta una mensualidad si el vehículo ya tiene una
// activa, por lo que se puede ejecutar tantas veces como se quiera.
// -----------------------------------------------------------------------
const MENSUALIDADES_AL_DIA = {
  carro: [1, 2, 3, 4, 5],
  moto: [1, 2, 3, 4, 5, 6, 7, 8],
};
const MENSUALIDADES_EN_MORA = {
  carro: [6],
  moto: [9],
};

// Formatea a YYYY-MM-DD usando la fecha LOCAL (no toISOString/UTC, que puede
// adelantar un día en Colombia por el desfase de zona horaria).
const ymd = (f) =>
  `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, "0")}-${String(
    f.getDate(),
  ).padStart(2, "0")}`;

// Calcula las tres fechas base de las mensualidades de prueba.
const fechasMensualidad = () => {
  const hoy = new Date();
  const mesAdelante = new Date(hoy);
  mesAdelante.setMonth(mesAdelante.getMonth() + 1);
  const mesAtras = new Date(hoy);
  mesAtras.setMonth(mesAtras.getMonth() - 1);
  // Fecha ya vencida: 10 días antes de hoy (para el caso "en mora")
  const vencido = new Date(hoy);
  vencido.setDate(vencido.getDate() - 10);
  return { inicio: ymd(mesAtras), fin: ymd(mesAdelante), vencido: ymd(vencido) };
};

// Crea las mensualidades de prueba que falten.
// @returns {Promise<number>} cantidad de mensualidades insertadas.
async function sincronizarMensualidades(conn) {
  const [vehiculosDb] = await conn.query(
    `SELECT v.id_vehiculo, v.placa, tv.codigo AS tipo_codigo, tv.tarifa_mensual
     FROM vehiculos v
     INNER JOIN tipos_vehiculos tv ON tv.id_tipo_vehiculo = v.id_tipo_vehiculo`,
  );
  const idPorPlaca = Object.fromEntries(
    vehiculosDb.map((v) => [v.placa, v.id_vehiculo]),
  );
  const tipoPorPlaca = Object.fromEntries(
    vehiculosDb.map((v) => [v.placa, v.tipo_codigo]),
  );

  // Vehículos que ya tienen una mensualidad activa: no se duplican.
  const [conMensualidad] = await conn.query(
    `SELECT DISTINCT id_vehiculo FROM mensualidades WHERE estado = 'activa'`,
  );
  const yaTienen = new Set(conMensualidad.map((m) => m.id_vehiculo));

  // Operador por defecto (el más antiguo) al que se le atribuyen las ventas.
  const [operador] = await conn.query(
    "SELECT id_usuario FROM usuarios WHERE rol = 'operador' AND estado = 'activo' ORDER BY id_usuario LIMIT 1",
  );
  if (!operador.length) return 0;
  const idOperador = operador[0].id_usuario;

  const { inicio, fin, vencido } = fechasMensualidad();
  const placaDe = (tipo, numero) =>
    tipo === "moto" ? placaMoto(numero) : placaCarro(numero);

  const nuevas = [];
  const agregar = (placa, fechaFin) => {
    const idVehiculo = idPorPlaca[placa];
    if (!idVehiculo) return; // la placa no existe en esta base
    if (yaTienen.has(idVehiculo)) return; // ya tiene mensualidad activa
    const tipo = tipoPorPlaca[placa];
    const valor = tipo === "moto" ? 100000 : 250000;
    yaTienen.add(idVehiculo);
    nuevas.push([
      idVehiculo,
      idOperador,
      inicio,
      fechaFin,
      valor,
      "activa",
    ]);
  };

  for (const [tipo, numeros] of Object.entries(MENSUALIDADES_AL_DIA)) {
    for (const n of numeros) agregar(placaDe(tipo, n), fin);
  }
  for (const [tipo, numeros] of Object.entries(MENSUALIDADES_EN_MORA)) {
    for (const n of numeros) agregar(placaDe(tipo, n), vencido);
  }

  if (nuevas.length === 0) return 0;
  await conn.query(
    `INSERT INTO mensualidades
       (id_vehiculo, id_usuario_registro, fecha_inicio, fecha_fin, valor, estado)
     VALUES ?`,
    [nuevas],
  );
  return nuevas.length;
}

async function main() {
  const reset = process.argv.includes("--reset");
  const conn = await pool.getConnection();
  try {
    if (reset) {
      console.log("⚠️  Modo --reset: se vaciarán todas las tablas...");
      const tablas = await vaciarBase(conn);
      console.log(`✅ Tablas vaciadas: ${tablas}`);
    }

    const [[{ total }]] = await conn.query(
      "SELECT COUNT(*) AS total FROM tipos_vehiculos",
    );
    if (total > 0) {
      console.log(
        "La base ya tiene datos: se completa lo que falta (no se borra nada).",
      );
      // En vez de salirse sin hacer nada, se completa modelo/color en los
      // vehículos que lo tengan vacío (no modifica ningún otro dato).
      const actualizados = await sincronizarModeloColor(conn);
      console.log(
        actualizados > 0
          ? `Vehículos actualizados con modelo y color: ${actualizados}`
          : "Todos los vehículos ya tienen modelo y color. No se modificó nada.",
      );

      const placas = await sincronizarPlacasMoto(conn);
      console.log(
        placas > 0
          ? `Placas de moto migradas al formato AAA##X: ${placas}`
          : "Las placas de moto ya usan el formato vigente.",
      );

      const usuarios = await sincronizarUsuarios(conn);
      console.log(
        usuarios.length > 0
          ? `Usuarios agregados: ${usuarios.join(", ")}`
          : "Todos los usuarios del catálogo ya existían.",
      );

      const mensualidades = await sincronizarMensualidades(conn);
      console.log(
        mensualidades > 0
          ? `Mensualidades creadas: ${mensualidades}`
          : "Todos los vehículos de prueba ya tienen mensualidad.",
      );
      return;
    }

    await conn.beginTransaction();
    console.log("Iniciando seed...");

    // 1. Tipos de vehículo
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
    console.log("Tipos de vehículo creados");

    // 2. Puertas (accesos_vehiculos exige id_puerta_ingreso con FK)
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
    console.log(`Celdas creadas: ${celdas.length} (70 carro + 10 moto)`);

    // 4. Usuarios representativos (roles y estados distintos).
    // Todos con clave "123456" para poder probar el login.
    const usuarios = [];
    for (const u of USUARIOS_SEED) {
      usuarios.push([
        u.rol,
        u.tipo_documento,
        u.documento,
        u.nombres,
        u.apellidos,
        u.telefono,
        u.email,
        u.usuario_login,
        await bcrypt.hash(u.clave, 10),
        u.estado,
      ]);
    }
    await conn.query(
      `INSERT INTO usuarios
         (rol, tipo_documento, documento, nombres, apellidos, telefono,
          email, usuario_login, clave_hash, estado)
       VALUES ?`,
      [usuarios],
    );
    console.log(
      `Usuarios creados: ${usuarios.length} ` +
        `(admin, operador, lucia activos; carlos, marta inactivos) - clave: 123456`,
    );

    // 5. Vehículos con propietario integrado
    const nombres = [
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
    const apellidos = [
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

    // Modelos y colores por tipo de vehículo.
    // Reutiliza el catálogo de módulo (MODELOS_POR_TIPO / COLORES) para que
    // una base recién sembrada y una base sincronizada queden idénticas.
    const modelosCarro = MODELOS_POR_TIPO.carro;
    const modelosMoto = MODELOS_POR_TIPO.moto;
    const colores = COLORES;

    // Año de lanzamiento del modelo (columna `modelo`, VARCHAR(4)).
    // Se toma del catálogo: cada nombre comercial tiene su año.
    const anioDe = (nombreModelo) => anioDeModelo(nombreModelo);

    const fila = (idTipo, placa, i, base, prefijoTel, nombreModelo, anio, color) => [
      idTipo,
      placa,
      color,
      anio,
      nombreModelo,
      `${nombres[(i - 1) % 10]} ${apellidos[(i - 1) % 10]}`,
      "cc",
      String(base + ((i - 1) % 10)),
      `${prefijoTel}${String(i).padStart(7, "0")}`,
      `${nombres[(i - 1) % 10].toLowerCase()}.${apellidos[(i - 1) % 10].toLowerCase()}@email.com`,
      null, // id_celda_fija
      true,
    ];

    const vehiculos = [];
    for (let i = 1; i <= 70; i++) {
      vehiculos.push(
        fila(
          idTipoCarro,
          placaCarro(i),
          i,
          1000000000,
          "300",
          modelosCarro[(i - 1) % modelosCarro.length],
          anioDe(modelosCarro[(i - 1) % modelosCarro.length]),
          colores[(i - 1) % colores.length],
        ),
      );
    }
    for (let i = 1; i <= 10; i++) {
      vehiculos.push(
        fila(
          idTipoMoto,
          placaMoto(i),
          i,
          2000000000,
          "310",
          modelosMoto[(i - 1) % modelosMoto.length],
          anioDe(modelosMoto[(i - 1) % modelosMoto.length]),
          colores[(i - 1) % colores.length],
        ),
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
    console.log(`Vehículos creados: ${vehiculos.length} (70 carro + 10 moto)`);

    // 6. Mensualidades.
    // "Al día" / "En mora" / "Sin mensualidad" se DERIVAN de CURRENT_DATE vs
    // fecha_fin. Se cubren los tres casos en los DOS tipos de vehículo, para
    // que el ingreso de carros y de motos sea testeable de punta a punta
    // (ver MENSUALIDADES_AL_DIA / MENSUALIDADES_EN_MORA).
    const mensualidadesCreadas = await sincronizarMensualidades(conn);
    console.log(
      `Mensualidades creadas: ${mensualidadesCreadas} ` +
        `(CAR001-CAR005 y MOT01A-MOT08A al día; CAR006 y MOT09A en mora). ` +
        `Sin mensualidad: CAR007-CAR070 y MOT10A`,
    );

    await conn.commit();
    console.log("✅ Seed completado.");
    console.log(
      "   Usuarios de prueba (clave 123456): admin, operador, lucia (activos) | carlos, marta (inactivos)",
    );
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
