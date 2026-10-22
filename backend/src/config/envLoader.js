// backend/src/config/envLoader.js
// ============================================================================
// CONFIGURACIÓN DE VARIABLES DE ENTORNO - BACKEND AUTO COLOMBIA
// ============================================================================
// Este archivo lee el archivo backend/.env y exporta las variables de entorno
// utilizadas por el servidor. No depende del paquete dotenv.
//
// Qué hace:
//   - Lee backend/.env con el módulo nativo fs.
//   - Parsea cada línea KEY=VALUE y la asigna a process.env.
//   - Normaliza la configuración de MySQL en DB_* y arma DATABASE_URL.
//   - Exporta un objeto con PORT, DB_*, CORS_* y NODE_ENV.
//
// Qué sucede si se configura:
//   - Si falta DB_HOST, DB_USER o DB_NAME, el servidor mostrará un error claro
//     al iniciar y no se levantará hasta corregirlo.
//   - Si PORT falta, se usa 3000 por defecto.
//   - Si DATABASE_URL está definida, tiene prioridad sobre los campos DB_*.
// ============================================================================

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { join } from "path";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const envPath = join(__dirname, "..", "..", ".env");

try {
  const content = readFileSync(envPath, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    let value = trimmed.slice(eqIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
} catch (err) {
  console.error("❌ No se pudo leer el archivo .env:", err.message);
  process.exit(1);
}

const num = (valor, porDefecto) => {
  const n = parseInt(valor ?? "", 10);
  return Number.isFinite(n) ? n : porDefecto;
};

const bool = (valor, porDefecto) => {
  if (valor === undefined || valor === "") return porDefecto;
  return String(valor).toLowerCase() === "true";
};

// --- MySQL: campos sueltos (DB_*) o URL completa (DATABASE_URL) ---
const DB_HOST = process.env.DB_HOST ?? "localhost";
const DB_PORT = num(process.env.DB_PORT, 3306);
const DB_USER = process.env.DB_USER ?? "";
const DB_PASSWORD = process.env.DB_PASSWORD ?? "";
const DB_NAME = process.env.DB_NAME ?? "";

// Si no viene DATABASE_URL se arma con los campos DB_*.
// La contraseña se codifica con encodeURIComponent para no romper la URL
// si contiene caracteres especiales (@ : / ? #).
const DATABASE_URL =
  process.env.DATABASE_URL ||
  (DB_USER && DB_NAME
    ? `mysql://${encodeURIComponent(DB_USER)}:${encodeURIComponent(
        DB_PASSWORD,
      )}@${DB_HOST}:${DB_PORT}/${DB_NAME}`
    : "");

const required = [
  ["DB_HOST", DB_HOST],
  ["DB_USER", DB_USER],
  ["DB_NAME", DB_NAME],
];
const missing = required
  .filter(([, valor]) => !valor)
  .map(([clave]) => clave);

if (missing.length > 0) {
  console.error(
    `❌ Faltan variables de entorno obligatorias: ${missing.join(", ")}`,
  );
  console.error(
    "   Revisa el archivo backend/.env y asegúrate de definir todas las variables.",
  );
  process.exit(1);
}

export const env = {
  PORT: num(process.env.PORT, 3000),
  NODE_ENV: process.env.NODE_ENV || "development",

  // MySQL
  DB_HOST,
  DB_PORT,
  DB_USER,
  DB_PASSWORD,
  DB_NAME,
  DATABASE_URL,

  // Seguridad
  TRUST_PROXY: num(process.env.TRUST_PROXY, 0),
  CORS_ORIGIN: process.env.CORS_ORIGIN || "http://localhost:5173",
  COOKIE_SECURE: bool(process.env.COOKIE_SECURE, false),
};

console.log(
  `🔧 Entorno cargado: NODE_ENV=${env.NODE_ENV}, PORT=${env.PORT}, DB=${env.DB_NAME}`,
);
