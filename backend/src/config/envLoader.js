// backend/src/config/envLoader.js
// Lee backend/.env (sin dotenv), lo carga en process.env y exporta la
// configuracion ya tipada. Si falta una variable obligatoria, el servidor
// no arranca y muestra cual falta.

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { join } from "path";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const envPath = join(__dirname, "..", "..", ".env");

try {
  const contenido = readFileSync(envPath, "utf8");
  for (const linea of contenido.split(/\r?\n/)) {
    const texto = linea.trim();
    if (!texto || texto.startsWith("#")) continue;
    const igual = texto.indexOf("=");
    if (igual === -1) continue;
    const clave = texto.slice(0, igual).trim();
    let valor = texto.slice(igual + 1).trim();
    if (
      (valor.startsWith('"') && valor.endsWith('"')) ||
      (valor.startsWith("'") && valor.endsWith("'"))
    ) {
      valor = valor.slice(1, -1);
    }
    if (!(clave in process.env)) process.env[clave] = valor;
  }
} catch {
  console.warn(
    "No se encontro backend/.env: se usan las variables del sistema.",
  );
}

const numero = (valor, porDefecto) => {
  const n = parseInt(valor ?? "", 10);
  return Number.isFinite(n) ? n : porDefecto;
};

const DB_HOST = process.env.DB_HOST ?? "localhost";
const DB_USER = process.env.DB_USER ?? "";
const DB_NAME = process.env.DB_NAME ?? "";

const faltantes = [
  ["DB_HOST", DB_HOST],
  ["DB_USER", DB_USER],
  ["DB_NAME", DB_NAME],
]
  .filter(([, valor]) => !valor)
  .map(([clave]) => clave);

if (faltantes.length > 0) {
  console.error(
    `Faltan variables de entorno obligatorias: ${faltantes.join(", ")}`,
  );
  console.error("Revisa backend/.env (modelo en backend/.env.example).");
  process.exit(1);
}

export const env = {
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: numero(process.env.PORT, 3000),
  DB_HOST,
  DB_PORT: numero(process.env.DB_PORT, 3306),
  DB_USER,
  DB_PASSWORD: process.env.DB_PASSWORD ?? "",
  DB_NAME,
  CORS_ORIGIN: process.env.CORS_ORIGIN || "http://localhost:5173",
};
