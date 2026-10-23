// backend/src/app.js
// Configuracion de Express. La API es abierta (sin autenticacion): el
// operador y el turno se resuelven en movimientoController.js.

import express from "express";
import cors from "cors";
import { env } from "./config/envLoader.js";
import routes from "./routes/index.js";

const app = express();

app.use(cors({ origin: env.CORS_ORIGIN }));
app.use(express.json());

app.use("/api", routes);

export default app;
