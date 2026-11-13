// Carga backend/.env (sin dotenv) en process.env y exporta `env` ya validado.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { parseEnv, construirEnv } from "./envParser.js";

const envPath = join(
  fileURLToPath(new URL(".", import.meta.url)),
  "..",
  "..",
  ".env",
);
try {
  for (const [k, v] of Object.entries(
    parseEnv(readFileSync(envPath, "utf8")),
  )) {
    if (!(k in process.env)) process.env[k] = v;
  }
  // Si estamos en entorno de prueba, usar la BD de prueba
  if (process.env.NODE_ENV === "test") {
    process.env.DB_NAME = process.env.DB_NAME_TEST || "autos_colombia_test";
  }
} catch {
  console.warn(
    "No se encontrÃ³ backend/.env: se usan las variables del sistema.",
  );
}

export const env = construirEnv(process.env);
