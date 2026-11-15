// Limitadores de peticiones. `esPolling` ahora solo exime lecturas (GET).
import rateLimit from "express-rate-limit";
import { env } from "../config/envLoader.js";
import { responder } from "../utils/responseHelper.js";
import { MSG } from "../utils/messages.js";

const VENTANA = 15 * 60 * 1000;

export const RUTAS_POLLING = [
  "/api/celdas",
  "/api/movimientos/historial",
  "/api/users",
];

/** Solo GET a rutas de polling. Antes se eximían también POST/PUT/PATCH/DELETE. */
export const esPolling = (req) =>
  req.method === "GET" &&
  RUTAS_POLLING.some(
    (base) => req.path === base || req.path.startsWith(base + "/"),
  );

const mensaje = (texto) => (_req, res) =>
  responder(res, 429, texto);

export const limitadorGlobal = rateLimit({
  windowMs: VENTANA,
  limit: env.NODE_ENV === "development" ? 2000 : 1000,
  standardHeaders: true,
  legacyHeaders: false,
  skipFailedRequests: true,
  skip: (req) => req.path === "/api/health" || esPolling(req),
  handler: mensaje("Demasiadas peticiones. Espera unos segundos."),
});

export const limitadorLogin = rateLimit({
  windowMs: VENTANA,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  handler: mensaje("Demasiados intentos fallidos. Intenta más tarde."),
});

/** Re-autenticación de admin (verify-password, register, edición de usuarios): frena fuerza bruta con token robado. */
export const limitadorSensible = rateLimit({
  windowMs: VENTANA,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  skip: (req) => req.method === "GET",
  handler: mensaje("Demasiados intentos de confirmación. Intenta más tarde."),
});