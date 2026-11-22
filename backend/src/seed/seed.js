// backend/src/seed/seed.js
// Datos de prueba. Las mensualidades se crean con las mismas reglas que el sistema real
// (periodo = inicio + 1 mes - 1 día, fechas en hora de Bogotá) y cada una lleva su
// confirmación de pago, igual que lo haría registrarPago.
import bcrypt from "bcryptjs";
import { pool } from "../config/db.js";
import { MODELOS_POR_TIPO, COLORES } from "./catalogoVehiculos.js";
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
  "Elena",
  "Jorge",
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
  "Torres",
  "Ruiz",
];
const ROLES_VALIDOS = ["administrador", "operador"];

const placaCarro = (n) => `CAR${String(n).padStart(3, "0")}`;
const placaMoto = (n) => `MOT${String(n).padStart(2, "0")}A`;

/** Inicio de un periodo cuyo fin (inicio + 1 mes - 1 día) sea exactamente `fin`. */
function inicioParaFin(fin) {
  for (let d = 27; d <= 31; d++) {
    const ini = sumarDias(fin, -d);
    if (calcularFin(ini) === fin) return ini;
  }
  return sumarDias(fin, -29);
}

/**
 * Escenarios de demostración por placa (offset de días del fin respecto a hoy).
 *  - al_dia:    vigente con más de 5 días (no puede renovar todavía)
 *  - proximo:   faltan 1..4 días (dentro de la ventana de renovación)
 *  - pendiente: hoy es el último día pagado (aún puede entrar)
 *  - vencida:   venció hace 10 días (Sin mensualidad)
 *  - renovada:  vigente + siguiente periodo ya confirmado
 * El resto de vehículos queda "Sin mensualidad".
 */
function escenarios() {
  const e = [];
  for (let i = 1; i <= 20; i++) e.push([placaCarro(i), "al_dia", 8 + (i % 20)]);
  for (let i = 21; i <= 23; i++) e.push([placaCarro(i), "proximo", i - 20]);
  e.push([placaCarro(24), "pendiente", 0]);
  e.push([placaCarro(25), "vencida", -10]);
  e.push([placaCarro(26), "vencida", -10]);
  e.push([placaCarro(27), "renovada", 3]);
  for (let i = 1; i <= 5; i++) e.push([placaMoto(i), "al_dia", 8 + i * 3]);
  e.push([placaMoto(6), "proximo", 2]);
  e.push([placaMoto(7), "vencida", -10]);
  return e;
}

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
    "administrador",
    "cc",
    "1000000000",
    "Administrador",
    "Principal",
    "3000000000",
    "admin@autoscolombia.com",
    "admin",
    await bcrypt.hash("123456", 10),
  ]);

  // 2. Operador principal (siempre presente)
  usuarios.push([
    "operador",
    "cc",
    "1000000001",
    "Operador",
    "Principal",
    "3000000001",
    "operador@autoscolombia.com",
    "operador",
    await bcrypt.hash("123456", 10),
  ]);

  // 3. 10 usuarios adicionales alternando roles válidos
  for (let i = 0; i < 10; i++) {
    const rol = ROLES_VALIDOS[i % ROLES_VALIDOS.length];
    const idx = i + 2; // índice global 2..11
    const nombre = NOMBRES[idx % NOMBRES.length];
    const apellido = APELLIDOS[idx % APELLIDOS.length];
    const usuarioLogin = `${rol.substring(0, 3)}${idx + 1}`;
    usuarios.push([
      rol,
      "cc",
      String(1000000000 + idx),
      nombre,
      apellido,
      `300${String(idx).padStart(7, "0")}`,
      `${nombre.toLowerCase()}.${apellido.toLowerCase()}${idx}@autoscolombia.com`,
      usuarioLogin,
      await bcrypt.hash("123456", 10),
    ]);
  }

  await conn.query(
    `INSERT INTO usuarios (rol, tipo_documento, documento, nombres, apellidos, telefono, email, usuario_login, clave_hash) 
     VALUES ?`,
    [usuarios],
  );
  console.log(
    "Usuarios staff creados: 12 (1 admin + 1 operador principal + 10 adicionales)",
  );
}

async function main() {
  const reset = process.argv.includes("--reset");
  const conn = await pool.getConnection();
  try {
    if (reset) {
      await vaciarBase(conn);
    } else {
      const [checks] = await conn.query(
        "SELECT COUNT(*) as count FROM usuarios",
      );
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
       VALUES ('carro', 'Carro', 250000), ('moto', 'Moto', 100000)`,
    );
    const [tipos] = await conn.query(
      "SELECT id_tipo_vehiculo, codigo FROM tipos_vehiculos",
    );
    const idTipoCarro = tipos.find(
      (t) => t.codigo === "carro",
    ).id_tipo_vehiculo;
    const idTipoMoto = tipos.find((t) => t.codigo === "moto").id_tipo_vehiculo;

    // 2. Puertas
    await conn.query(
      `INSERT INTO puertas (nombre, ubicacion, disponible_nocturna, activa)
       VALUES ('Puerta 1', 'Principal', TRUE, TRUE), ('Puerta 2', 'Secundaria', FALSE, TRUE)`,
    );

    // 3. Celdas
    const celdas = [];
    for (const letra of ["A", "B", "C", "D", "E", "F", "G"]) {
      for (let n = 1; n <= 10; n++) celdas.push([idTipoCarro, letra, n]);
    }
    for (let n = 1; n <= 10; n++) celdas.push([idTipoMoto, "H", n]);
    await conn.query(
      "INSERT INTO celdas (id_tipo_vehiculo, letra, numero) VALUES ?",
      [celdas],
    );

    // 4. Vehiculos y Propietarios (algunos con doble vehiculo)
    const vehiculos = [];
    const propietarios = [];
    for (let i = 0; i < 50; i++) {
      propietarios.push({
        nombre: `${NOMBRES[i % NOMBRES.length]} ${APELLIDOS[i % APELLIDOS.length]}`,
        doc: String(2000000000 + i),
        tel: `310${String(i).padStart(7, "0")}`,
        email: `cliente${i}@email.com`,
      });
    }

    // 70 carros y 10 motos
    for (let i = 1; i <= 70; i++) {
      const owner = propietarios[i % propietarios.length];
      vehiculos.push([
        idTipoCarro,
        placaCarro(i),
        COLORES[i % COLORES.length],
        MODELOS_POR_TIPO.carro[i % MODELOS_POR_TIPO.carro.length].anio,
        MODELOS_POR_TIPO.carro[i % MODELOS_POR_TIPO.carro.length].nombre,
        owner.nombre,
        "cc",
        owner.doc,
        owner.tel,
        owner.email,
        true,
      ]);
    }
    for (let i = 1; i <= 10; i++) {
      const owner = propietarios[i % propietarios.length];
      vehiculos.push([
        idTipoMoto,
        placaMoto(i),
        COLORES[i % COLORES.length],
        MODELOS_POR_TIPO.moto[i % MODELOS_POR_TIPO.moto.length].anio,
        MODELOS_POR_TIPO.moto[i % MODELOS_POR_TIPO.moto.length].nombre,
        owner.nombre,
        "cc",
        owner.doc,
        owner.tel,
        owner.email,
        true,
      ]);
    }
    await conn.query(
      `INSERT INTO vehiculos (id_tipo_vehiculo, placa, color, modelo, nombre_modelo, propietario_nombre, propietario_tipo_documento, propietario_documento, propietario_telefono, propietario_email, activo) VALUES ?`,
      [vehiculos],
    );

    // 5. Mensualidades + confirmación de pago (mismas reglas que registrarPago)
    const [vehs] = await conn.query(
      `SELECT v.id_vehiculo, v.placa, tv.tarifa_mensual
       FROM vehiculos v INNER JOIN tipos_vehiculos tv ON tv.id_tipo_vehiculo = v.id_tipo_vehiculo`,
    );
    const porPlaca = new Map(vehs.map((v) => [v.placa, v]));
    const [[operador]] = await conn.query(
      "SELECT id_usuario FROM usuarios WHERE usuario_login = 'operador' LIMIT 1",
    );
    const idOperador = operador.id_usuario;

    // Turno abierto del operador (los pagos se registran dentro de un turno)
    const [turno] = await conn.query(
      "INSERT INTO turnos (id_usuario, estado, base_inicial) VALUES (?, 'abierto', 0)",
      [idOperador],
    );
    const idTurno = turno.insertId;

    const hoy = hoyBogota();
    const crearMensualidad = async (v, inicio, fin) => {
      const valor = Number(v.tarifa_mensual);
      const [m] = await conn.query(
        `INSERT INTO mensualidades (id_vehiculo, id_usuario_registro, fecha_inicio, fecha_fin, valor, estado)
         VALUES (?, ?, ?, ?, ?, 'activa')`,
        [v.id_vehiculo, idOperador, inicio, fin, valor],
      );
      // El pago se confirmó el día de inicio (o hoy, si es un periodo futuro)
      const diaPago = inicio < hoy ? inicio : hoy;
      await conn.query(
        `INSERT INTO pagos (id_mensualidad, id_turno, id_usuario, monto, fecha_pago)
         VALUES (?, ?, ?, ?, ?)`,
        [m.insertId, idTurno, idOperador, valor, `${diaPago} 14:00:00`],
      );
    };

    let totalMens = 0;
    for (const [placa, tipo, offset] of escenarios()) {
      const v = porPlaca.get(placa);
      if (!v) continue;
      const fin = sumarDias(hoy, offset);
      const inicio = inicioParaFin(fin);
      await crearMensualidad(v, inicio, calcularFin(inicio));
      totalMens++;
      if (tipo === "renovada") {
        const sigInicio = sumarDias(calcularFin(inicio), 1);
        await crearMensualidad(v, sigInicio, calcularFin(sigInicio));
        totalMens++;
      }
    }
    console.log(`Mensualidades creadas: ${totalMens} (con su pago confirmado)`);

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
