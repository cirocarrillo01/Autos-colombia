// backend/src/app.js
// Configuracion de Express. La API usa autenticacion JWT (Bearer) en rutas protegidas.

import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { env } from "./config/envLoader.js";
import routes from "./routes/index.js";

const app = express();

// Detrás de Nginx / load balancer, confiar en X-Forwarded-For para que
// req.ip sea la IP real del cliente (necesario para rate limiting y para
// login_attempts.ip_address). Se configura con TRUST_PROXY en .env:
//   0       -> sin proxy (default, desarrollo)
//   1       -> un proxy delante
//   2       -> dos (ej. Cloudflare + Nginx)
//   loopback|1.2.3.4 -> confiar solo en esas direcciones
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

// Rate limiting global básico.
// En desarrollo se usa un límite más alto para evitar 429 por recargas
// y StrictMode de React (que monta componentes dos veces).
const isDev = env.NODE_ENV === "development";
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 300 : 100,
  standardHeaders: true,
  legacyHeaders: false,
  // /api/health no cuenta para el límite
  skip: (req) => req.path === "/api/health",
});
app.use(limiter);

// Rate limiting más estricto para login (10 req / 15 min por IP)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
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
