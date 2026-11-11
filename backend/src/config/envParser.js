// Funciones puras para leer y validar variables de entorno (testeables sin tocar disco).

/** Parsea el contenido de un .env. Soporta comillas y comentarios `# ...` en línea. */
export function parseEnv(contenido) {
  const out = {};
  for (const linea of String(contenido).split(/\r?\n/)) {
    const texto = linea.trim();
    if (!texto || texto.startsWith("#")) continue;
    const igual = texto.indexOf("=");
    if (igual === -1) continue;
    const clave = texto.slice(0, igual).trim();
    let valor = texto.slice(igual + 1).trim();
    if (valor.length >= 2) {
      const primera = valor[0];
      const ultima = valor[valor.length - 1];
      if ((primera === '"' || primera === "'") && primera === ultima) {
        valor = valor.slice(1, -1);
      } else {
        valor = recortarComentarioEnLinea(valor);
      }
    } else {
      valor = recortarComentarioEnLinea(valor);
    }
    out[clave] = valor;
  }
  return out;
}

/** Elimina un comentario en línea "# ..." precedido de espacio en blanco. */
function recortarComentarioEnLinea(valor) {
  const inicio = valor.indexOf("#");
  if (inicio > 0 && /\s/.test(valor[inicio - 1])) {
    return valor.slice(0, inicio).trimEnd();
  }
  return valor;
}

/** Convierte a entero o devuelve el valor por defecto. */
export const entero = (valor, porDefecto) => {
  const n = Number.parseInt(valor ?? "", 10);
  return Number.isFinite(n) ? n : porDefecto;
};

/** Construye la configuración tipada. Lanza Error si falta algo obligatorio. */
export function construirEnv(src = process.env) {
  const obligatorias = ["DB_USER", "DB_NAME", "JWT_SECRET"];
  const faltantes = obligatorias.filter((k) => !src[k]);
  if (faltantes.length) {
    throw new Error(
      `Faltan variables de entorno obligatorias: ${faltantes.join(", ")} (modelo en backend/.env.example)`
    );
  }
  const NODE_ENV = src.NODE_ENV || "development";
  if (NODE_ENV === "production" && src.JWT_SECRET.length < 32) {
    throw new Error(
      "JWT_SECRET debe tener al menos 32 caracteres en producción"
    );
  }
  const origenes = (
    src.CORS_ORIGIN || "http://localhost:5173,http://localhost:5174"
  )
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return {
    NODE_ENV,
    PORT: entero(src.PORT, 3000),
    DB_HOST: src.DB_HOST || "localhost",
    DB_PORT: entero(src.DB_PORT, 3306),
    DB_USER: src.DB_USER,
    DB_PASSWORD: src.DB_PASSWORD ?? "",
    DB_NAME: src.DB_NAME,
    CORS_ORIGINS: origenes,
    TRUST_PROXY: src.TRUST_PROXY ?? "0",
    JWT_SECRET: src.JWT_SECRET,
    JWT_EXPIRES_IN: src.JWT_EXPIRES_IN || "8h",
  };
}