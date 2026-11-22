// backend/src/seed/seed2.js
import bcrypt from "bcryptjs";
import { pool } from "../config/db.js";

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

async function vaciarUsuarios(conn) {
  await conn.query("SET FOREIGN_KEY_CHECKS = 0");
  try {
    await conn.query("TRUNCATE TABLE `usuarios`");
  } finally {
    await conn.query("SET FOREIGN_KEY_CHECKS = 1");
  }
}

async function crearUsuarios(conn) {
  const usuarios = [];
  const claveHash = await bcrypt.hash("123456", 10);

  // 1. Administrador principal
  usuarios.push([
    "administrador",
    "cc",
    "1000000000",
    "Administrador",
    "Principal",
    "3000000000",
    "admin@autoscolombia.com",
    "admin",
    claveHash,
  ]);

  // 2. Operador principal
  usuarios.push([
    "operador",
    "cc",
    "1000000001",
    "Operador",
    "Principal",
    "3000000001",
    "operador@autoscolombia.com",
    "operador",
    claveHash,
  ]);

  // 3. 10 usuarios adicionales alternando entre administrador y operador
  for (let i = 0; i < 10; i++) {
    const rol = ROLES_VALIDOS[i % ROLES_VALIDOS.length];
    const idx = i + 2;
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
      claveHash,
    ]);
  }

  await conn.query(
    `INSERT INTO usuarios (
      rol, tipo_documento, documento, nombres, apellidos,
      telefono, email, usuario_login, clave_hash
    ) VALUES ?`,
    [usuarios],
  );

  console.log(
    "Usuarios creados: 12 (1 administrador principal + 1 operador principal + 10 adicionales)",
  );
}

async function main() {
  const reset = process.argv.includes("--reset");
  const conn = await pool.getConnection();

  try {
    if (reset) {
      await vaciarUsuarios(conn);
    } else {
      const [checks] = await conn.query(
        "SELECT COUNT(*) AS count FROM usuarios",
      );
      if (Number(checks[0].count) > 0) {
        console.log("La tabla usuarios ya tiene datos.");
        return;
      }
    }

    await conn.beginTransaction();
    await crearUsuarios(conn);
    await conn.commit();

    console.log("Seed de usuarios completado.");
  } catch (err) {
    await conn.rollback();
    console.error(err);
  } finally {
    conn.release();
    await pool.end();
  }
}

main();
