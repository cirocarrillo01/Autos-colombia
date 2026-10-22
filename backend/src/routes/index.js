// backend/src/routes/index.js

// ============================================================================
// RUTAS PRINCIPALES - AUTO COLOMBIA
// ============================================================================
// Este archivo registra todas las rutas de la API bajo un único enrutador.
// Se importa en app.js con el prefijo /api, por lo que aquí las rutas se
// definen sin repetir /api (ej. /vehiculos, /celdas, /movimientos).
//
// Qué hace:
//   - Importa los enrutadores de cada recurso.
//   - Los monta bajo sus respectivos paths.
//
// Qué sucede si se configura:
//   - Las peticiones llegan como:
//       GET    /api/vehiculos/:placa
//       GET    /api/celdas
//       POST   /api/movimientos
//   - Si se agrega un nuevo recurso (ej. /usuarios), solo se importa su
//     enrutador y se monta aquí.
// ============================================================================

import { Router } from "express";
import vehiculos from "./vehiculos.js";
import celdas from "./celdas.js";
import movimientos from "./movimientos.js";

const router = Router();

router.use("/vehiculos", vehiculos);
router.use("/celdas", celdas);
router.use("/movimientos", movimientos);

export default router;
