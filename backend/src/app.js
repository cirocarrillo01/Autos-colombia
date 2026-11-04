//backend/src/app.js
// Configuración de Express. La API usa autenticación JWT (Bearer) en rutas protegidas.

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

// Headers de seguridad
app.use(helmet());

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:3000",
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error("No permitido por CORS"));
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  credentials: true
}));
app.use(express.json());

const isDev = env.NODE_ENV === "development";

// Rutas de polling que quedan excluidas del rate limit general.
const POLLING_PATHS = [
  "/api/celdas",
  "/api/celdas/resumen",
  "/api/celdas/bloques",
  "/api/celdas/disponibles",
  "/api/celdas/tipos",
  "/api/movimientos/historial",
  "/api/users",
];

/**
 * Determina si una petición es de tipo polling.
 * @param {import('express').Request} req 
 * @returns {boolean}
 */
const esPolling = (req) => {
  const p = req.path;
  return POLLING_PATHS.some((base) => p === base || p.startsWith(base + "/"));
};

// Rate limiting global.
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 2000 : 1000,
  standardHeaders: true,
  legacyHeaders: false,
  skipFailedRequests: true,
  skip: (req) => req.path === "/api/health" || esPolling(req),
  handler: (_req, res) =>
    res
      .status(429)
      .json({ error: "Demasiadas peticiones. Espera unos segundos." }),
});
app.use(limiter);

// Rate limiting específico para login contra ataques de fuerza bruta.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  skipFailedRequests: false,
  handler: (_req, res) =>
    res
      .status(429)
      .json({ error: "Demasiados intentos fallidos. Intenta más tarde." }),
});
app.use("/api/auth/login", loginLimiter);

app.use("/api", routes);
app.use("/api", (_req, res) =>
  res.status(404).json({ error: "Ruta no encontrada" }),
);

// Manejador final de errores global.
app.use((err, _req, res, _next) => {
  console.error(err);
  const status = err.status ?? 500;
  res.status(status).json({
    error: status === 500 ? "Error interno del servidor" : err.message,
  });
});

export default app;