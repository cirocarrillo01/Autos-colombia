// Gestión de usuarios (RF1.5-1.7).
import * as userRepository from "../repositories/userRepository.js";
import { validarDatosUsuario } from "../middleware/validation.js";

const limpiar = ({ clave_hash, ...u }) => ({
  ...u,
  sesion_activa: !!u.sesion_activa,
});

export const listarUsuarios = async (opts) => {
  const r = await userRepository.listar(opts);
  return { ...r, rows: r.rows.map(limpiar) };
};

export const obtenerUsuario = async (id) => {
  const u = await userRepository.findById(id);
  return u
    ? { status: 200, body: limpiar(u) }
    : { status: 404, error: "Usuario no encontrado" };
};

export const editarUsuario = async (id, datos) => {
  const invalido = validarDatosUsuario(datos, { requiereClave: false });
  if (invalido) return { status: 400, error: invalido };
  if (!(await userRepository.findById(id)))
    return { status: 404, error: "Usuario no encontrado" };

  const dup = await userRepository.findDuplicate(
    {
      tipo_documento: datos.tipo_documento,
      documento: datos.documento,
      usuario_login: datos.usuario_login,
      email: datos.email || undefined,
    },
    id,
  );
  if (dup)
    return {
      status: 409,
      error:
        "Ya existe otro usuario con ese documento, usuario de acceso o correo.",
    };

  if (!(await userRepository.actualizar(id, datos)))
    return { status: 200, body: { mensaje: "No se realizaron cambios" } };
  return {
    status: 200,
    body: {
      mensaje: "Usuario actualizado correctamente",
      usuario: limpiar(await userRepository.findById(id)),
    },
  };
};

export const cambiarEstadoUsuario = async (id, estado) => {
  if (!["activo", "inactivo"].includes(estado))
    return { status: 400, error: "Estado inválido (activo | inactivo)" };
  if (!(await userRepository.findById(id)))
    return { status: 404, error: "Usuario no encontrado" };
  await userRepository.cambiarEstado(id, estado);
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
