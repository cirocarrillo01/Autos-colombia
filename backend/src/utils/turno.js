// backend/src/utils/turno.js
import { pool } from "../config/db.js";

export async function getOrCreateTurno(conn, idUsuario) {
  const [turnos] = await conn.query(
    "SELECT id_turno FROM turnos WHERE id_usuario = ? AND estado = 'abierto' LIMIT 1",
    [idUsuario]
  );
  if (turnos.length) return turnos[0].id_turno;
  const [r] = await conn.query(
    "INSERT INTO turnos (id_usuario, estado, base_inicial) VALUES (?, 'abierto', 0)",
    [idUsuario]
  );
  return r.insertId;
}
