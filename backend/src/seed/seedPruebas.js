// backend/src/seed/seedPruebas.js
// Datos de prueba para el plan PP-03 (gestión de pagos, iteración 3).
// Deja la base en un estado conocido: usuarios por rol, vehículos con cada escenario de
// mensualidad (nuevo, vencido, por vencer, pendiente, renovado, cancelado, dentro...),
// historial para eliminar/desactivar y, si se pide, los cupos casi llenos o llenos.
//
// Las fechas son RELATIVAS A HOY (hora de Bogotá): hay que volver a correr el seed
// antes de cada ejecución de pruebas, porque los vencimientos cambian cada día.
//
// Uso (desde backend/):
//   npm run seed:pruebas                      -> base normal
//   npm run seed:pruebas -- --cupo=carros-69  -> 69/70 carros ocupados (queda 1 cupo)
//   npm run seed:pruebas -- --cupo=carros-70  -> 70/70 carros ocupados (lleno)
//   npm run seed:pruebas -- --cupo=motos-10   -> 10/10 motos ocupadas (lleno)
//   npm run seed:pruebas -- --force           -> permite una base cuyo nombre no contiene "test"
//
// OJO: vacía las tablas antes de cargar. Por seguridad solo corre si DB_NAME contiene "test".
import { fileURLToPath } from "node:url";
import bcrypt from "bcryptjs";
import { pool } from "../config/db.js";
import { env } from "../config/envLoader.js";
import { hoyBogota, calcularFin, sumarDias } from "../utils/mensualidad.js";

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

const CUPOS = { carro: 70, moto: 10 };
const CUPOS_VALIDOS = ["ninguno", "carros-69", "carros-70", "motos-10"];
const CLAVE = "123456";

/** Inicio de un periodo cuyo fin (inicio + 1 mes - 1 día) sea exactamente `fin`. */
function inicioParaFin(fin) {
  for (let d = 27; d <= 31; d++) {
    const ini = sumarDias(fin, -d);
    if (calcularFin(ini) === fin) return ini;
  }
  return sumarDias(fin, -29);
}

// ---------------------------------------------------------------------------
// Definición de los datos (función pura: no toca la base, se puede probar sola)
// ---------------------------------------------------------------------------

/**
 * Cada mensualidad: { fin: días respecto a hoy, estado?: "activa"|"cancelada" }
 * o { inicio: días respecto a hoy } para un periodo que empieza en un día concreto.
 */
export function construirDatos(hoy, cupo = "ninguno") {
  const DUENO_MARIA = {
    nombre: "Maria Lopez",
    tipo_documento: "cc",
    documento: "1020304050",
    telefono: "3101020304",
    email: "maria.lopez@email.com",
  };
  let n = 0;
  const dueno = () => {
    n++;
    return {
      nombre: `Cliente Prueba ${n}`,
      tipo_documento: "cc",
      documento: String(3000000000 + n),
      telefono: `320${String(n).padStart(7, "0")}`,
      email: `cliente${n}@email.com`,
    };
  };
  const v = (placa, tipo, extra = {}) => ({
    placa,
    tipo,
    color: extra.color ?? "Blanco",
    modelo: extra.modelo ?? (tipo === "carro" ? "2020" : "2021"),
    nombre_modelo:
      extra.nombre_modelo ??
      (tipo === "carro" ? "Chevrolet Spark" : "Honda CB 125F"),
    dueno: extra.dueno ?? dueno(),
    activo: extra.activo ?? true,
    mens: extra.mens ?? [],
    acceso: extra.acceso ?? null, // "dentro" | "historial"
    nota: extra.nota ?? "",
  });

  const vehiculos = [
    // --- Pagos (SD23 a SD30) ---
    v("ABC101", "carro", {
      dueno: DUENO_MARIA,
      nota: "Nuevo, sin mensualidad ni historial (pago nuevo)",
    }),
    v("ABC111", "carro", {
      dueno: DUENO_MARIA,
      nota: "Sin mensualidad; mismo dueño que ABC101 (CU33)",
    }),
    v("ABC102", "carro", {
      mens: [{ fin: -1 }],
      nota: "Venció ayer (reactivación)",
    }),
    v("ABC103", "carro", {
      mens: [{ fin: 5 }],
      nota: "Vence en 5 días (renovación permitida)",
    }),
    v("ABC110", "carro", {
      mens: [{ fin: 6 }],
      nota: "Vence en 6 días (renovación bloqueada)",
    }),
    v("ABC104", "carro", {
      mens: [{ fin: 20 }],
      nota: "Vence en 20 días (renovación bloqueada; se usa para cancelar)",
    }),
    v("ABC105", "carro", {
      mens: [{ fin: 0 }],
      nota: "Termina hoy sin siguiente (Pendiente)",
    }),
    v("ABC106", "carro", {
      mens: [{ fin: 3 }, { siguiente: true }],
      nota: "Vigente (3 días) + siguiente periodo ya pagado",
    }),
    v("ABC107", "carro", {
      mens: [{ fin: 15 }],
      acceso: "dentro",
      nota: "Vigente y DENTRO del parqueadero",
    }),
    v("ABC116", "carro", {
      mens: [{ fin: 0 }, { siguiente: true }],
      nota: "Termina hoy pero ya pagó el siguiente (Al día)",
    }),
    v("ABC115", "carro", {
      mens: [{ inicio: 1 }],
      nota: "Mensualidad pagada que empieza mañana (Al día)",
    }),
    // --- Gestión de vehículos (SD31 a SD36) ---
    v("ABC108", "carro", {
      nota: "Sin mensualidad, ingresos ni pagos (eliminable)",
    }),
    v("ABC109", "carro", {
      mens: [{ fin: 10, estado: "cancelada" }],
      nota: "Sin mensualidad con historial: mensualidad cancelada y su pago (desactivable)",
    }),
    v("ABC112", "carro", {
      acceso: "historial",
      nota: "Sin mensualidad con ingreso/salida anterior (no se puede eliminar)",
    }),
    v("ABC113", "carro", {
      activo: false,
      mens: [{ fin: -20 }],
      nota: "Vehículo INACTIVO",
    }),
    // --- Historial (SD40, SD41) ---
    v("ABC114", "carro", {
      mens: [{ fin: -60 }, { fin: -30, estado: "cancelada" }, { fin: 12 }],
      nota: "3 mensualidades (una cancelada) y 3 pagos",
    }),
    // --- Para llenar la lista (paginación y filtros) ---
    v("ABC117", "carro", { mens: [{ fin: 9 }], nota: "Al día" }),
    v("ABC118", "carro", { mens: [{ fin: 14 }], nota: "Al día" }),
    v("ABC119", "carro", { mens: [{ fin: 18 }], nota: "Al día" }),
    v("ABC121", "carro", { mens: [{ fin: 22 }], nota: "Al día" }),
    v("ABC122", "carro", { mens: [{ fin: 25 }], nota: "Al día" }),
    v("ABC123", "carro", { nota: "Sin mensualidad" }),
    // --- Motos ---
    v("XYZ12A", "moto", { nota: "Moto sin mensualidad (pago nuevo)" }),
    v("XYZ13B", "moto", { mens: [{ fin: 9 }], nota: "Moto Al día" }),
    v("XYZ14C", "moto", { mens: [{ fin: -3 }], nota: "Moto vencida" }),
  ];
  // Placas que NO existen a propósito (los casos las registran): ABC120, ABC124, XYZ15C, ABC999.

  // Relleno de cupos: vehículos con mensualidad vigente hasta alcanzar el objetivo.
  const ocupa = (x) =>
    x.activo &&
    x.mens.some(
      (m) =>
        m.estado !== "cancelada" &&
        !m.siguiente &&
        (m.inicio !== undefined || m.fin >= 0),
    );
  const ocupados = (tipo) =>
    vehiculos.filter((x) => x.tipo === tipo && ocupa(x)).length;
  const objetivo = {
    "carros-69": ["carro", 69],
    "carros-70": ["carro", 70],
    "motos-10": ["moto", 10],
  }[cupo];
  if (objetivo) {
    const [tipo, meta] = objetivo;
    const faltan = meta - ocupados(tipo);
    for (let i = 1; i <= faltan; i++) {
      const placa =
        tipo === "carro"
          ? `RLL${String(i).padStart(3, "0")}`
          : `RLM${String(i).padStart(2, "0")}A`;
      vehiculos.push(
        v(placa, tipo, { mens: [{ fin: 20 }], nota: "Relleno de cupo" }),
      );
    }
  }

  const usuarios = [
    {
      rol: "administrador",
      login: "admin_prueba",
      doc: "1000000000",
      nombres: "Admin",
      apellidos: "Prueba",
      estado: "activo",
    },
    {
      rol: "operador",
      login: "operador_prueba",
      doc: "1000000001",
      nombres: "Operador",
      apellidos: "Uno",
      estado: "activo",
    },
    {
      rol: "operador",
      login: "operador_dos",
      doc: "1000000002",
      nombres: "Operador",
      apellidos: "Dos",
      estado: "activo",
    },
    {
      rol: "operador",
      login: "operador_inactivo",
      doc: "1000000003",
      nombres: "Operador",
      apellidos: "Inactivo",
      estado: "inactivo",
    },
  ];
  return { hoy, vehiculos, usuarios };
}

// ---------------------------------------------------------------------------
// Carga en la base
// ---------------------------------------------------------------------------

async function vaciarBase(conn) {
  await conn.query("SET FOREIGN_KEY_CHECKS = 0");
  try {
    for (const tabla of TABLAS) await conn.query(`TRUNCATE TABLE \`${tabla}\``);
  } finally {
    await conn.query("SET FOREIGN_KEY_CHECKS = 1");
  }
}

export async function cargar(conn, datos) {
  const { hoy, vehiculos, usuarios } = datos;

  // 1. Usuarios
  const hash = await bcrypt.hash(CLAVE, 10);
  await conn.query(
    `INSERT INTO usuarios (rol, tipo_documento, documento, nombres, apellidos, telefono, email, usuario_login, clave_hash, estado)
     VALUES ?`,
    [
      usuarios.map((u) => [
        u.rol,
        "cc",
        u.doc,
        u.nombres,
        u.apellidos,
        `300${u.doc.slice(-7)}`,
        `${u.login}@autoscolombia.com`,
        u.login,
        hash,
        u.estado,
      ]),
    ],
  );
  const [us] = await conn.query(
    "SELECT id_usuario, usuario_login FROM usuarios",
  );
  const idUsuario = Object.fromEntries(
    us.map((u) => [u.usuario_login, u.id_usuario]),
  );

  // 2. Tipos, puertas y celdas
  await conn.query(
    `INSERT INTO tipos_vehiculos (codigo, nombre, tarifa_mensual)
     VALUES ('carro', 'Carro', 250000), ('moto', 'Moto', 100000)`,
  );
  const [tipos] = await conn.query(
    "SELECT id_tipo_vehiculo, codigo FROM tipos_vehiculos",
  );
  const idTipo = Object.fromEntries(
    tipos.map((t) => [t.codigo, t.id_tipo_vehiculo]),
  );

  await conn.query(
    `INSERT INTO puertas (nombre, ubicacion, disponible_nocturna, activa)
     VALUES ('Puerta 1', 'Principal', TRUE, TRUE), ('Puerta 2', 'Secundaria', FALSE, TRUE)`,
  );
  const [[puerta]] = await conn.query(
    "SELECT id_puerta FROM puertas ORDER BY id_puerta LIMIT 1",
  );

  const celdas = [];
  for (const letra of ["A", "B", "C", "D", "E", "F", "G"]) {
    for (let k = 1; k <= 10; k++) celdas.push([idTipo.carro, letra, k]);
  }
  for (let k = 1; k <= 10; k++) celdas.push([idTipo.moto, "H", k]);
  await conn.query(
    "INSERT INTO celdas (id_tipo_vehiculo, letra, numero) VALUES ?",
    [celdas],
  );
  const [cel] = await conn.query(
    "SELECT id_celda FROM celdas WHERE letra = 'A' AND numero IN (1, 2) ORDER BY numero",
  );

  // 3. Vehículos
  await conn.query(
    `INSERT INTO vehiculos (id_tipo_vehiculo, placa, color, modelo, nombre_modelo, propietario_nombre,
       propietario_tipo_documento, propietario_documento, propietario_telefono, propietario_email, activo)
     VALUES ?`,
    [
      vehiculos.map((x) => [
        idTipo[x.tipo],
        x.placa,
        x.color,
        x.modelo,
        x.nombre_modelo,
        x.dueno.nombre,
        x.dueno.tipo_documento,
        x.dueno.documento,
        x.dueno.telefono,
        x.dueno.email,
        x.activo,
      ]),
    ],
  );
  const [vs] = await conn.query(
    `SELECT v.id_vehiculo, v.placa, tv.tarifa_mensual
     FROM vehiculos v INNER JOIN tipos_vehiculos tv ON tv.id_tipo_vehiculo = v.id_tipo_vehiculo`,
  );
  const porPlaca = new Map(vs.map((x) => [x.placa, x]));

  // 4. Turno abierto de operador_prueba (operador_dos y el admin quedan SIN turno a propósito,
  //    para probar que el primer pago abre el turno solo).
  const idOperador = idUsuario.operador_prueba;
  const [t] = await conn.query(
    "INSERT INTO turnos (id_usuario, estado, base_inicial) VALUES (?, 'abierto', 0)",
    [idOperador],
  );
  const idTurno = t.insertId;

  // 5. Mensualidades con su pago (igual que registrarPago)
  const crearMensualidad = async (veh, inicio, fin, estado = "activa") => {
    const valor = Number(veh.tarifa_mensual);
    const [m] = await conn.query(
      `INSERT INTO mensualidades (id_vehiculo, id_usuario_registro, fecha_inicio, fecha_fin, valor, estado)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [veh.id_vehiculo, idOperador, inicio, fin, valor, estado],
    );
    const diaPago = inicio < hoy ? inicio : hoy;
    await conn.query(
      `INSERT INTO pagos (id_mensualidad, id_turno, id_usuario, monto, fecha_pago) VALUES (?, ?, ?, ?, ?)`,
      [m.insertId, idTurno, idOperador, valor, `${diaPago} 14:00:00`],
    );
  };

  let totalMens = 0;
  for (const x of vehiculos) {
    const veh = porPlaca.get(x.placa);
    let finAnterior = null;
    for (const m of x.mens) {
      let inicio;
      let fin;
      if (m.siguiente) {
        inicio = sumarDias(finAnterior, 1);
        fin = calcularFin(inicio);
      } else if (m.inicio !== undefined) {
        inicio = sumarDias(hoy, m.inicio);
        fin = calcularFin(inicio);
      } else {
        fin = sumarDias(hoy, m.fin);
        inicio = inicioParaFin(fin);
        fin = calcularFin(inicio);
      }
      await crearMensualidad(veh, inicio, fin, m.estado ?? "activa");
      finAnterior = fin;
      totalMens++;
    }
  }

  // 6. Accesos: ABC107 dentro del parqueadero; ABC112 con un ingreso/salida anterior
  for (const x of vehiculos.filter((q) => q.acceso)) {
    const veh = porPlaca.get(x.placa);
    if (x.acceso === "dentro") {
      await conn.query(
        `INSERT INTO accesos_vehiculos (id_vehiculo, id_celda, id_puerta_ingreso, id_operador_ingreso, id_turno_ingreso)
         VALUES (?, ?, ?, ?, ?)`,
        [
          veh.id_vehiculo,
          cel[0].id_celda,
          puerta.id_puerta,
          idOperador,
          idTurno,
        ],
      );
    } else {
      await conn.query(
        `INSERT INTO accesos_vehiculos (id_vehiculo, id_celda, id_puerta_ingreso, id_operador_ingreso, id_turno_ingreso,
           fecha_ingreso, id_puerta_salida, id_operador_salida, id_turno_salida, fecha_salida)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          veh.id_vehiculo,
          cel[1].id_celda,
          puerta.id_puerta,
          idOperador,
          idTurno,
          `${sumarDias(hoy, -3)} 15:00:00`,
          puerta.id_puerta,
          idOperador,
          idTurno,
          `${sumarDias(hoy, -3)} 17:30:00`,
        ],
      );
    }
  }
  return { totalMens };
}

function resumen(datos, totalMens) {
  const { vehiculos } = datos;
  console.log("\nUsuarios ( 123456):");
  for (const u of datos.usuarios)
    console.log(
      `  ${u.login.padEnd(18)} ${u.rol}${u.estado === "inactivo" ? " (inactivo)" : ""}`,
    );
  console.log("\nVehículos de prueba:");
  for (const x of vehiculos.filter((q) => q.nota !== "Relleno de cupo")) {
    console.log(`  ${x.placa}  ${x.tipo.padEnd(5)} ${x.nota}`);
  }
  const rell = vehiculos.filter((q) => q.nota === "Relleno de cupo").length;
  if (rell)
    console.log(`  (+ ${rell} vehículos de relleno RLL…/RLM… para el cupo)`);
  console.log(
    `\nVehículos: ${vehiculos.length} · Mensualidades con pago: ${totalMens}`,
  );
  console.log(
    "Placas libres para los casos que registran: ABC120, ABC124, XYZ15C. No registrada: ABC999.",
  );
}

async function main() {
  const args = process.argv.slice(2);
  const cupoArg = (
    args.find((a) => a.startsWith("--cupo=")) ?? "--cupo=ninguno"
  ).split("=")[1];
  if (!CUPOS_VALIDOS.includes(cupoArg)) {
    console.error(`--cupo inválido. Use uno de: ${CUPOS_VALIDOS.join(", ")}`);
    process.exitCode = 1;
    return;
  }
  if (!/test/i.test(String(env.DB_NAME)) && !args.includes("--force")) {
    console.error(
      `Este seed vacía las tablas y la base "${env.DB_NAME}" no parece de pruebas. ` +
        `Use una base con "test" en el nombre o agregue --force.`,
    );
    process.exitCode = 1;
    return;
  }

  const datos = construirDatos(hoyBogota(), cupoArg);
  const conn = await pool.getConnection();
  try {
    await vaciarBase(conn);
    await conn.beginTransaction();
    const { totalMens } = await cargar(conn, datos);
    await conn.commit();
    console.log(
      `Seed de pruebas listo en "${env.DB_NAME}" (hoy = ${datos.hoy}, cupo = ${cupoArg}).`,
    );
    resumen(datos, totalMens);
  } catch (err) {
    await conn.rollback();
    console.error("Seed de pruebas falló, se deshizo todo:", err);
    process.exitCode = 1;
  } finally {
    conn.release();
    await pool.end();
  }
}

// Solo corre cuando se ejecuta directamente (no al importarlo desde una prueba).
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1])
  main();
