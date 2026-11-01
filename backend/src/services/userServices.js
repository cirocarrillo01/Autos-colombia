// backend/src/services/userServices.js
// Lógica de negocio de gestión de usuarios (RF1.5, RF1.6, RF1.7).
// Solo el administrador puede listar con filtros, editar, cambiar rol y activar/desactivar.

import * as userRepository from "../repositories/userRepository.js";
import { validarDatosUsuario } from "../middleware/validation.js";

/**
 * RF1.5 - Listar y buscar usuarios por nombre, documento, rol o estado (paginado).
 * @param {object} opts
 * @returns {object} { rows, total, page, limit }
 */
export const listarUsuarios = async (opts) => {
  const res = await userRepository.listar(opts);
  return {
    ...res,
    rows: (res.rows ?? []).map((r) => ({
      ...r,
      sesion_activa: !!r.sesion_activa,
    })),
  };
};

/**
 * Obtiene un usuario por su id (sin devolver la clave_hash).
 * @param {number} id_usuario
 * @returns {object} { status, body } o { status, error }
 */
export const obtenerUsuario = async (id_usuario) => {
  const usuario = await userRepository.findById(id_usuario);
  if (!usuario) {
    return { status: 404, error: "Usuario no encontrado" };
  }
  const { clave_hash, ...sinClave } = usuario;
  sinClave.sesion_activa = !!sinClave.sesion_activa;
  return { status: 200, body: sinClave };
};

/**
 * RF1.6 - Editar los datos de un usuario y cambiar su rol (solo administrador).
 * @param {number} id_usuario
 * @param {object} datos
 * @returns {object}
 */
export const editarUsuario = async (id_usuario, datos) => {
  const errorValidacion = validarDatosUsuario(datos, { requiereClave: false });
  if (errorValidacion) {
    return { status: 400, error: errorValidacion };
  }

  const existe = await userRepository.findById(id_usuario);
  if (!existe) {
    return { status: 404, error: "Usuario no encontrado" };
  }

  // RF1.2: validar unicidad excluyendo al propio usuario.
  const duplicado = await userRepository.findDuplicate(
    {
      tipo_documento: datos.tipo_documento,
      documento: datos.documento,
      usuario_login: datos.usuario_login,
      email: datos.email || undefined,
    },
    id_usuario,
  );
  if (duplicado) {
    return {
      status: 409,
      error:
        "Ya existe otro usuario con ese documento, usuario de acceso o correo.",
    };
  }

  const actualizado = await userRepository.actualizar(id_usuario, datos);
  if (!actualizado) {
    return { status: 200, body: { mensaje: "No se realizaron cambios" } };
  }

  const actual = await userRepository.findById(id_usuario);
  const { clave_hash, ...sinClave } = actual;
  sinClave.sesion_activa = !!sinClave.sesion_activa;

  return {
    status: 200,
    body: { mensaje: "Usuario actualizado correctamente", usuario: sinClave },
  };
};

/**
 * RF1.7 - Activar o desactivar un usuario sin eliminarlo (soft delete).
 * @param {number} id_usuario
 * @param {string} estado - 'activo' | 'inactivo'
 * @returns {object}
 */
export const cambiarEstadoUsuario = async (id_usuario, estado) => {
  const existe = await userRepository.findById(id_usuario);
  if (!existe) {
    return { status: 404, error: "Usuario no encontrado" };
  }
  if (!["activo", "inactivo"].includes(estado)) {
    return { status: 400, error: "Estado inválido (activo | inactivo)" };
  }

  await userRepository.cambiarEstado(id_usuario, estado);
  return {
    status: 200,
    body: {
      mensaje: `Usuario ${estado === "activo" ? "activado" : "desactivado"} correctamente`,
    },
  };
};

export default {
  listarUsuarios,
  obtenerUsuario,
  editarUsuario,
  cambiarEstadoUsuario,
};
