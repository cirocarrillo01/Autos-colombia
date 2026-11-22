// backend/src/routes/cupos.js
import { Router } from "express";
import { autenticar } from "../middleware/authMiddleware.js";
import { listarCupos } from "../controllers/cuposController.js";

const router = Router();
router.get("/", autenticar, listarCupos);
export default router;
