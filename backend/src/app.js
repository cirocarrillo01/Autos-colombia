// Configuración de Express (JWT Bearer en rutas protegidas).
import express from "express";
import cors from "cors";
import helmet from "helmet";
import { env } from "./config/envLoader.js";
import routes from "./routes/index.js";
import {
  limitadorGlobal,
  limitadorLogin,
  limitadorSensible,
} from "./middleware/rateLimit.js";

const app = express();

if (env.TRUST_PROXY !== "0") {
  const n = Number.parseInt(env.TRUST_PROXY, 10);
  app.set("trust proxy", Number.isFinite(n) ? n : env.TRUST_PROXY);
}

app.use(helmet());
// Antes: lista fija + FRONTEND_URL y se ignoraba CORS_ORIGIN (que sí documenta el README).
app.use(
  cors({
    origin(origin, cb) {
      if (!origin || env.CORS_ORIGINS.includes(origin)) return cb(null, true);
      cb(
        Object.assign(new Error("Origen no permitido por CORS"), {
          status: 403,
        }),
      );
    },
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    credentials: true,
  }),
);
app.use(express.json({ limit: "100kb" }));

app.use(limitadorGlobal);
app.use("/api/auth/login", limitadorLogin);
app.use(
  ["/api/auth/verify-password", "/api/auth/register", "/api/users"],
  limitadorSensible,
);

app.use("/api", routes);
app.use("/api", (_req, res) =>
  res.status(404).json({ error: "Ruta no encontrada" }),
);

app.use((err, _req, res, _next) => {
  const status = err.status ?? err.statusCode ?? 500;
  if (status >= 500) console.error(err);
  res
    .status(status)
    .json({
      error: status >= 500 ? "Error interno del servidor" : err.message,
    });
});

export default app;
