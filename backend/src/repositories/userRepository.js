// Acceso a `usuarios` (SQL nativo).
import { query } from "../config/db.js";
import { paginar, likeSeguro } from "../utils/consultas.js";

const COLUMNAS = `id_usuario, rol, tipo_documento, documento, nombres, apellidos, telefono, email,
  usuario_login, estado, ultimo_acceso, sesion_activa, fecha_sesion_activa, fecha_registro`;

export const findByLogin = async (login) =>
  (
    await query(
      `SELECT ${COLUMNAS}, clave_hash FROM usuarios WHERE usuario_login = ? LIMIT 1`,
      [login],
    )
  )[0] ?? null;

export const findById = async (id) =>
  (
    await query(
      `SELECT ${COLUMNAS} FROM usuarios WHERE id_usuario = ? LIMIT 1`,
      [id],
    )
  )[0] ?? null;

export const findDuplicate = async (
  { tipo_documento, documento, usuario_login, email },
  excludeId = null,
) => {
  const params = [tipo_documento, documento, usuario_login];
  let sql = `SELECT id_usuario, documento, usuario_login, email, tipo_documento FROM usuarios
             WHERE ((tipo_documento = ? AND documento = ?) OR usuario_login = ?`;
  if (email) {
    sql += ` OR email = ?`;
    params.push(email);
  }
  sql += `)`;
  if (excludeId != null) {
    sql += ` AND id_usuario <> ?`;
    params.push(excludeId);
  }
  return (await query(sql + ` LIMIT 1`, params))[0] ?? null;
};

export const create = async (d) => ({
  insertId: (
    await query(
      `INSERT INTO usuarios (rol, tipo_documento, documento, nombres, apellidos, telefono, email, usuario_login, clave_hash, estado)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'activo')`,
      [
        d.rol,
        d.tipo_documento,
        d.documento,
        d.nombres,
        d.apellidos,
        d.telefono || null,
        d.email || null,
        d.usuario_login,
        d.clave_hash,
      ],
    )
  ).insertId,
});

export const listar = async ({
  search = "",
  rol = "",
  estado = "",
  page,
  limit,
} = {}) => {
  const {
    page: p,
    limit: l,
    offset,
  } = paginar({ page, limit }, { porDefecto: 10 });
  const conds = [],
    params = [];
  if (search) {
    conds.push(
      `(nombres LIKE ? OR apellidos LIKE ? OR documento LIKE ? OR usuario_login LIKE ?)`,
    );
    const s = likeSeguro(search);
    params.push(s, s, s, s);
  }
  if (rol) {
    conds.push(`rol = ?`);
    params.push(rol);
  }
  if (estado) {
    conds.push(`estado = ?`);
    params.push(estado);
  }
  const where = conds.length ? `WHERE ${conds.join(" AND ")}` : "";

  const rows = await query(
    `SELECT ${COLUMNAS} FROM usuarios ${where} ORDER BY fecha_registro DESC LIMIT ? OFFSET ?`,
    [...params, l, offset],
  );
  const [{ total }] = await query(
    `SELECT COUNT(*) AS total FROM usuarios ${where}`,
    params,
  );
  return { rows, total: Number(total), page: p, limit: l };
};

const EDITABLES = [
  "rol",
  "tipo_documento",
  "documento",
  "nombres",
  "apellidos",
  "telefono",
  "email",
  "usuario_login",
  "estado",
];
export const actualizar = async (id, campos) => {
  const sets = [],
    params = [];
  for (const c of EDITABLES) {
    if (!(c in campos)) continue;
    const v = campos[c];
    sets.push(`${c} = ?`);
    params.push((c === "telefono" || c === "email") && v === "" ? null : v);
  }
  if (!sets.length) return false;
  return (
    (
      await query(
        `UPDATE usuarios SET ${sets.join(", ")} WHERE id_usuario = ?`,
        [...params, id],
      )
    ).affectedRows > 0
  );
};

export const cerrarSesionActiva = (id) =>
  query(
    `UPDATE usuarios SET sesion_activa = FALSE, fecha_sesion_activa = NULL WHERE id_usuario = ?`,
    [id],
  );

export const cambiarEstado = async (id, estado) => {
  const r = await query(`UPDATE usuarios SET estado = ? WHERE id_usuario = ?`, [
    estado,
    id,
  ]);
  if (estado === "inactivo") await cerrarSesionActiva(id);
  return r.affectedRows > 0;
};

export const cambiarClave = async (id, hash) =>
  (
    await query(`UPDATE usuarios SET clave_hash = ? WHERE id_usuario = ?`, [
      hash,
      id,
    ])
  ).affectedRows > 0;

export const registrarUltimoAcceso = (id) =>
  query(
    `UPDATE usuarios SET ultimo_acceso = UTC_TIMESTAMP() WHERE id_usuario = ?`,
    [id],
  );

export const registrarSesionActiva = (id) =>
  query(
    `UPDATE usuarios SET sesion_activa = TRUE, fecha_sesion_activa = UTC_TIMESTAMP() WHERE id_usuario = ?`,
    [id],
  );

export const registrarIntento = ({ usuario_login, exitoso, ip_address }) =>
  query(
    `INSERT INTO login_attempts (usuario_login, exitoso, ip_address) VALUES (?, ?, ?)`,
    [usuario_login, exitoso ? 1 : 0, ip_address],
  );

export const contarFallidosRecientes = async ({
  usuario_login = null,
  ip_address = null,
  minutos = 15,
} = {}) => {
  const conds = [
    `exitoso = 0`,
    `fecha_intento >= DATE_SUB(UTC_TIMESTAMP(), INTERVAL ? MINUTE)`,
  ];
  const params = [minutos];
  if (usuario_login) {
    conds.push(`usuario_login = ?`);
    params.push(usuario_login);
  }
  if (ip_address) {
    conds.push(`ip_address = ?`);
    params.push(ip_address);
  }
  const [{ total }] = await query(
    `SELECT COUNT(*) AS total FROM login_attempts WHERE ${conds.join(" AND ")}`,
    params,
  );
  return Number(total);
};

export default {
  findByLogin,
  findById,
  findDuplicate,
  create,
  listar,
  actualizar,
  cambiarEstado,
  cambiarClave,
  cerrarSesionActiva,
  registrarUltimoAcceso,
  registrarSesionActiva,
  registrarIntento,
  contarFallidosRecientes,
};
