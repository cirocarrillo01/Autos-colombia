// backend/src/repositories/userRepository.js
// Acceso a datos de la tabla `usuarios`. Consultas SQL nativas con mysql2/promise.
// No contiene lógica de negocio: solo operaciones CRUD y de auditoría de acceso.

import { query } from "../config/db.js";

/**
 * Busca un usuario por su usuario_login.
 * @returns {object|null}
 */
export const findByLogin = async (usuario_login) => {
  const filas = await query(
    `SELECT id_usuario, rol, tipo_documento, documento, nombres, apellidos,
            telefono, email, usuario_login, clave_hash, estado, ultimo_acceso,
            sesion_activa, fecha_sesion_activa, fecha_registro
     FROM usuarios
     WHERE usuario_login = ?
     LIMIT 1`,
    [usuario_login],
  );
  return filas[0] ?? null;
};

/**
 * Busca un usuario por id.
 * @returns {object|null}
 */
export const findById = async (id_usuario) => {
  const filas = await query(
    `SELECT id_usuario, rol, tipo_documento, documento, nombres, apellidos,
            telefono, email, usuario_login, estado, ultimo_acceso,
            sesion_activa, fecha_sesion_activa, fecha_registro
     FROM usuarios
     WHERE id_usuario = ?
     LIMIT 1`,
    [id_usuario],
  );
  return filas[0] ?? null;
};

/**
 * Verifica si ya existe un usuario con el mismo documento (por tipo),
 * usuario_login o correo, excluyendo un id opcional (para edición).
 * @returns {object|null} campo duplicado encontrado o null.
 */
export const findDuplicate = async (
  { tipo_documento, documento, usuario_login, email },
  excludeId = null,
) => {
  const params = [tipo_documento, documento, usuario_login];

  let sql = `
    SELECT id_usuario, documento, usuario_login, email, tipo_documento
    FROM usuarios
    WHERE ((tipo_documento = ? AND documento = ?) OR usuario_login = ?`;
  if (email) {
    sql += ` OR email = ?`;
    params.push(email);
  }
  sql += `)`;
  if (excludeId !== null && excludeId !== undefined) {
    sql += ` AND id_usuario <> ?`;
    params.push(excludeId);
  }
  sql += ` LIMIT 1`;
  const filas = await query(sql, params);
  return filas[0] ?? null;
};

/**
 * Crea un nuevo usuario. La clave ya debe venir cifrada (clave_hash).
 * @returns {object} { insertId }
 */
export const create = async (datos) => {
  const r = await query(
    `INSERT INTO usuarios
       (rol, tipo_documento, documento, nombres, apellidos, telefono, email,
        usuario_login, clave_hash, estado)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'activo')`,
    [
      datos.rol,
      datos.tipo_documento,
      datos.documento,
      datos.nombres,
      datos.apellidos,
      datos.telefono || null, // "" → NULL (email tiene UNIQUE)
      datos.email || null,
      datos.usuario_login,
      datos.clave_hash,
    ],
  );
  return { insertId: r.insertId };
};

/**
 * Lista usuarios con búsqueda y filtros, paginados.
 * @param {object} opts - { search, rol, estado, page, limit }
 * @returns {object} { rows, total }
 */
export const listar = async ({
  search = "",
  rol = "",
  estado = "",
  page = 1,
  limit = 10,
} = {}) => {
  const p = Number.parseInt(page, 10) || 1;
  const l = Number.parseInt(limit, 10) || 10;
  const offset = (p - 1) * l;

  const conds = [];
  const params = [];

  if (search) {
    conds.push(
      `(nombres LIKE ? OR apellidos LIKE ? OR documento LIKE ? OR usuario_login LIKE ?)`,
    );
    const s = `%${search}%`;
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
    `SELECT id_usuario, rol, tipo_documento, documento, nombres, apellidos,
            telefono, email, usuario_login, estado, ultimo_acceso,
            sesion_activa, fecha_sesion_activa, fecha_registro
     FROM usuarios
     ${where}
     ORDER BY fecha_registro DESC
     LIMIT ? OFFSET ?`,
    [...params, l, offset],
  );

  const countRows = await query(
    `SELECT COUNT(*) AS total FROM usuarios ${where}`,
    params,
  );

  return { rows, total: Number(countRows[0]?.total ?? 0), page: p, limit: l };
};

/**
 * Actualiza los datos de un usuario (sin tocar la clave).
 * Campos admitidos: rol, tipo_documento, documento, nombres, apellidos,
 * telefono, email, usuario_login, estado.
 * @returns {boolean} true si se actualizó al menos una fila.
 */
export const actualizar = async (id_usuario, campos) => {
  const permitidos = [
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
  const sets = [];
  const params = [];
  for (const campo of permitidos) {
    if (campo in campos) {
      let valor = campos[campo];
      if ((campo === "telefono" || campo === "email") && valor === "")
        valor = null;
      sets.push(`${campo} = ?`);
      params.push(valor);
    }
  }
  if (sets.length === 0) return false;
  params.push(id_usuario);
  const r = await query(
    `UPDATE usuarios SET ${sets.join(", ")} WHERE id_usuario = ?`,
    params,
  );
  return r.affectedRows > 0;
};

/**
 * Activa o desactiva un usuario (soft delete).
 * @returns {boolean}
 */
export const cambiarEstado = async (id_usuario, estado) => {
  const sql =
    estado === "inactivo"
      ? `UPDATE usuarios SET estado = ?, sesion_activa = FALSE, fecha_sesion_activa = NULL WHERE id_usuario = ?`
      : `UPDATE usuarios SET estado = ? WHERE id_usuario = ?`;
  const r = await query(sql, [estado, id_usuario]);
  return r.affectedRows > 0;
};

/**
 * Cambia la clave de un usuario (ya cifrada).
 * @returns {boolean}
 */
export const cambiarClave = async (id_usuario, clave_hash) => {
  const r = await query(
    `UPDATE usuarios SET clave_hash = ? WHERE id_usuario = ?`,
    [clave_hash, id_usuario],
  );
  return r.affectedRows > 0;
};

/**
 * Registra el último acceso exitoso de un usuario.
 * @returns {boolean}
 */
export const registrarUltimoAcceso = async (id_usuario) => {
  const r = await query(
    `UPDATE usuarios SET ultimo_acceso = UTC_TIMESTAMP() WHERE id_usuario = ?`,
    [id_usuario],
  );
  return r.affectedRows > 0;
};

/**
 * Establece sesion_activa = TRUE y fecha_sesion_activa al iniciar sesión.
 * @returns {boolean}
 */
export const registrarSesionActiva = async (id_usuario) => {
  const r = await query(
    `UPDATE usuarios SET sesion_activa = TRUE, fecha_sesion_activa = UTC_TIMESTAMP() WHERE id_usuario = ?`,
    [id_usuario],
  );
  return r.affectedRows > 0;
};

/**
 * Limpia el último acceso al cerrar sesión.
 * @returns {boolean}
 */
export const limpiarUltimoAcceso = async (id_usuario) => {
  const r = await query(
    `UPDATE usuarios SET ultimo_acceso = NULL WHERE id_usuario = ?`,
    [id_usuario],
  );
  return r.affectedRows > 0;
};

/**
 * Registra un intento de login en login_attempts.
 * @returns {object} { insertId }
 */
export const registrarIntento = async ({
  usuario_login,
  exitoso,
  ip_address,
}) => {
  const r = await query(
    `INSERT INTO login_attempts (usuario_login, exitoso, ip_address)
     VALUES (?, ?, ?)`,
    [usuario_login, exitoso ? 1 : 0, ip_address],
  );
  return { insertId: r.insertId };
};

/**
 * Cuenta intentos fallidos de un usuario_login y/o IP en una ventana de tiempo.
 * @param {object} opts - { usuario_login, ip_address, minutos }
 * @returns {number}
 */
export const contarFallidosRecientes = async ({
  usuario_login = null,
  ip_address = null,
  minutos = 15,
} = {}) => {
  const conds = [];
  const params = [];
  if (usuario_login) {
    conds.push(`usuario_login = ?`);
    params.push(usuario_login);
  }
  if (ip_address) {
    conds.push(`ip_address = ?`);
    params.push(ip_address);
  }
  conds.push(`exitoso = 0`);
  conds.push(`fecha_intento >= DATE_SUB(UTC_TIMESTAMP(), INTERVAL ? MINUTE)`);
  params.push(minutos);

  const where = conds.join(" AND ");
  const rows = await query(
    `SELECT COUNT(*) AS total FROM login_attempts WHERE ${where}`,
    params,
  );
  return Number(rows[0]?.total ?? 0);
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
  registrarUltimoAcceso,
  registrarSesionActiva,
  registrarIntento,
  contarFallidosRecientes,
};
