// backend/src/app.js
// Configuracion de Express. La API usa autenticacion JWT (Bearer) en rutas protegidas.

import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { env } from "./config/envLoader.js";
import routes from "./routes/index.js";

const app = express();

if (env.TRUST_PROXY && env.TRUST_PROXY !== "0") {
  const n = Number.parseInt(env.TRUST_PROXY, 10);
  app.set("trust proxy", Number.isFinite(n) ? n : env.TRUST_PROXY);
}

// Headers de seguridad (CSP, HSTS, X-Frame-Options, etc.)
app.use(helmet());

// CORS debe ir ANTES de rate limiting para que las preflight OPTIONS
// reciban Access-Control-Allow-Origin sin ser bloqueadas por el limitador.
app.use(cors({ origin: (origin, cb) => cb(null, true) }));
app.use(express.json());

const isDev = env.NODE_ENV === "development";

// Rutas que el frontend consulta en POLLING (dashboards, listados, celdas, etc.).
// Se excluyen del rate limit general para que la simple navegación no agote el
// cupo. El backend ya protege estas rutas con JWT + roles; el rate limit sigue
// aplicando a login, register, verify-password y demás mutaciones.
const POLLING_PATHS = [
  "/api/celdas",
  "/api/celdas/resumen",
  "/api/celdas/bloques",
  "/api/celdas/disponibles",
  "/api/celdas/tipos",
  "/api/movimientos/historial",
  "/api/users",
];

const esPolling = (req) => {
  const p = req.path;
  return POLLING_PATHS.some((base) => p === base || p.startsWith(base + "/"));
};

// Rate limiting global. En desarrollo se usa un límite más alto para evitar
// 429 por recargas y por el doble montaje de React StrictMode.
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 2000 : 1000,
  standardHeaders: true,
  legacyHeaders: false,
  // No contar peticiones que ya fueron rechazadas (429, 4xx, 5xx): así la
  // ventana se vacía aunque el cliente siga reintentando.
  skipFailedRequests: true,
  skip: (req) => req.path === "/api/health" || esPolling(req),
  handler: (_req, res) =>
    res
      .status(429)
      .json({ error: "Demasiadas peticiones. Espera unos segundos." }),
});
app.use(limiter);

// Rate limiting más estricto para login (10 req / 15 min por IP).
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skipFailedRequests: true,
  handler: (_req, res) =>
    res
      .status(429)
      .json({ error: "Demasiados intentos de login. Intenta más tarde." }),
});
app.use("/api/auth/login", loginLimiter);

app.use("/api", routes);
app.use("/api", (_req, res) =>
  res.status(404).json({ error: "Ruta no encontrada" }),
);

// Manejador final: siempre responde JSON (Express 5 reenvía los errores async aquí)
app.use((err, _req, res, _next) => {
  console.error(err);
  const status = err.status ?? 500;
  res.status(status).json({
    error: status === 500 ? "Error interno del servidor" : err.message,
  });
});

export default app;
