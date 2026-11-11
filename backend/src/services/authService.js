// Autenticación: login, registro, restablecer clave, logout y refresh.
import bcrypt from "bcryptjs";
import { generarToken, verificarToken } from "../middleware/authMiddleware.js";
import * as userRepository from "../repositories/userRepository.js";
import * as refreshTokenRepository from "../repositories/refreshTokenRepository.js";
import * as revokedTokenRepository from "../repositories/revokedTokenRepository.js";
import * as auditRepository from "../repositories/auditRepository.js";

export const MAX_INTENTOS_FALLIDOS = 5;
export const VENTANA_INTENTOS_MINUTOS = 15;
// Hash falso para gastar el mismo tiempo cuando el usuario no existe (evita enumerar usuarios por latencia).
const HASH_FALSO = bcrypt.hashSync("clave-falsa-para-igualar-tiempos", 10);

/**
 * IP del cliente. Se usa req.ip (respeta TRUST_PROXY). Antes se confiaba ciegamente en el
 * header X-Forwarded-For, así que cualquiera esquivaba el bloqueo por IP cambiándolo.
 */
export const obtenerIp = (req) =>
  req.ip || req.socket?.remoteAddress || "desconocida";

const errorAuth = () => ({ status: 401, error: "Usuario o clave incorrectos" });
const perfil = (u) => ({
  id_usuario: u.id_usuario,
  usuario_login: u.usuario_login,
  rol: u.rol,
  nombres: u.nombres,
  apellidos: u.apellidos,
  nombreCompleto: `${u.nombres} ${u.apellidos}`,
  estado: u.estado,
});

export const login = async (req, { usuario_login, clave } = {}) => {
  const login = String(usuario_login ?? "")
    .trim()
    .slice(0, 40);
  if (!login || !clave)
    return { status: 400, error: "Usuario y clave son obligatorios" };

  const ip = obtenerIp(req);
  const intento = (exitoso) =>
    userRepository.registrarIntento({
      usuario_login: login,
      exitoso,
      ip_address: ip,
    });

  const [porUsuario, porIp] = await Promise.all([
    userRepository.contarFallidosRecientes({
      usuario_login: login,
      minutos: VENTANA_INTENTOS_MINUTOS,
    }),
    userRepository.contarFallidosRecientes({
      ip_address: ip,
      minutos: VENTANA_INTENTOS_MINUTOS,
    }),
  ]);
  if (porUsuario >= MAX_INTENTOS_FALLIDOS || porIp >= MAX_INTENTOS_FALLIDOS) {
    // No se registra otro intento: antes cada intento bloqueado ampliaba el bloqueo indefinidamente.
    return {
      status: 423,
      error:
        "Acceso bloqueado temporalmente por múltiples intentos fallidos. Intente más tarde.",
    };
  }

  const usuario = await userRepository.findByLogin(login);
  const coincide = await bcrypt.compare(
    String(clave),
    usuario?.clave_hash ?? HASH_FALSO,
  );
  if (!usuario || !coincide) {
    await intento(false);
    return errorAuth();
  }
  if (usuario.estado !== "activo") {
    await intento(false);
    return { status: 403, error: "Usuario inactivo. No puede iniciar sesión." };
  }

  await intento(true);
  await userRepository.registrarUltimoAcceso(usuario.id_usuario);
  await userRepository.registrarSesionActiva(usuario.id_usuario);
  const token = generarToken(usuario.id_usuario);
  const refresh_token = await refreshTokenRepository.crearRefreshToken(
    usuario.id_usuario,
  );
  await auditRepository.registrarAudit({
    id_usuario: usuario.id_usuario,
    usuario_login: usuario.usuario_login,
    accion: "LOGIN",
    recurso: "auth",
    detalle: "Inicio de sesión exitoso",
    ip_address: ip,
  });
  return {
    status: 200,
    body: { token, refresh_token, usuario: perfil(usuario) },
  };
};

/** Campo que provocó el duplicado (antes podía quedar vacío: "ese ."). */
export function campoDuplicado(dup, datos) {
  if (
    dup.tipo_documento === datos.tipo_documento &&
    String(dup.documento) === String(datos.documento)
  )
    return "documento";
  if (
    String(dup.usuario_login).toLowerCase() ===
    String(datos.usuario_login).toLowerCase()
  )
    return "usuario de acceso";
  if (
    datos.email &&
    dup.email &&
    dup.email.toLowerCase() === String(datos.email).toLowerCase()
  )
    return "correo";
  return "dato único";
}

/** Crea el usuario. La validación de campos ya la hizo validarDatosUsuario en el controlador. `actor` = admin que lo crea. */
export const registrar = async (datos, actor = null) => {
  const dup = await userRepository.findDuplicate({
    tipo_documento: datos.tipo_documento,
    documento: datos.documento,
    usuario_login: datos.usuario_login,
    email: datos.email || undefined,
  });
  if (dup)
    return {
      status: 409,
      error: `Ya existe un usuario registrado con ese ${campoDuplicado(dup, datos)}.`,
    };

  const clave_hash = await bcrypt.hash(String(datos.clave), 10);
  const { insertId } = await userRepository.create({ ...datos, clave_hash });

  // Antes el audit se guardaba a nombre del usuario recién creado, no de quien lo creó.
  await auditRepository.registrarAudit({
    id_usuario: actor?.id_usuario ?? null,
    usuario_login: actor?.usuario_login ?? null,
    accion: "CREATE_USER",
    recurso: "usuarios",
    detalle: `Usuario creado: ${datos.usuario_login} (${datos.rol})`,
  });
  const c = await userRepository.findById(insertId);
  return {
    status: 201,
    body: {
      id_usuario: c.id_usuario,
      usuario_login: c.usuario_login,
      rol: c.rol,
      nombres: c.nombres,
      apellidos: c.apellidos,
      email: c.email,
    },
  };
};

export const restablecerClave = async ({ idUsuario, claveNueva, adminId }) => {
  const usuario = await userRepository.findById(idUsuario);
  if (!usuario) return { status: 404, error: "Usuario no encontrado" };

  await userRepository.cambiarClave(
    idUsuario,
    await bcrypt.hash(String(claveNueva), 10),
  );
  await refreshTokenRepository.revocarRefreshTokensUsuario(idUsuario);
  await userRepository.cerrarSesionActiva(idUsuario);

  const admin = adminId ? await userRepository.findById(adminId) : null;
  await auditRepository.registrarAudit({
    id_usuario: adminId ?? null,
    usuario_login: admin?.usuario_login ?? "sistema",
    accion: "RESET_PASSWORD",
    recurso: "usuarios",
    detalle: `Clave restablecida y sesiones revocadas para ${usuario.usuario_login}`,
  });
  return {
    status: 200,
    body: {
      mensaje: `Clave restablecida para el usuario ${usuario.usuario_login}. Sesiones activas cerradas.`,
    },
  };
};

/** Re-autenticación (step-up). Si `clave` falta devuelve 400 sin llamar a bcrypt con "undefined". */
export const verificarClaveUsuario = async ({ usuario_login, clave }) => {
  if (!clave) return { status: 400, error: "La clave es obligatoria" };
  const usuario = await userRepository.findByLogin(usuario_login);
  if (!usuario) return { status: 404, error: "Usuario no encontrado" };
  if (!(await bcrypt.compare(String(clave), usuario.clave_hash)))
    return { status: 400, error: "La clave es incorrecta" };
  return { status: 200, body: { ok: true } };
};

export const logout = async ({ idUsuario, token }) => {
  const usuario = await userRepository.findById(idUsuario);
  if (token) {
    try {
      const d = verificarToken(token);
      if (d?.jti && d?.exp) {
        await revokedTokenRepository.revocarToken({
          jti: d.jti,
          id_usuario: idUsuario,
          expires_at: new Date(d.exp * 1000),
        });
      }
    } catch (e) {
      console.warn("LOGOUT: no se pudo revocar el token:", e.message);
    }
  }
  await refreshTokenRepository.revocarRefreshTokensUsuario(idUsuario);
  await userRepository.cerrarSesionActiva(idUsuario);
  await auditRepository.registrarAudit({
    id_usuario: idUsuario,
    usuario_login: usuario?.usuario_login ?? null,
    accion: "LOGOUT",
    recurso: "auth",
    detalle: "Cierre de sesión",
  });
  return { status: 200, body: { ok: true } };
};

export const refresh = async ({ refresh_token }) => {
  if (!refresh_token) return { status: 400, error: "Refresh token requerido" };
  const row = await refreshTokenRepository.validarRefreshToken(refresh_token);
  if (!row) return { status: 401, error: "Refresh token inválido o expirado" };

  // Se valida al usuario ANTES de rotar (antes se emitía y revocaba tokens de usuarios inactivos).
  const usuario = await userRepository.findById(row.id_usuario);
  if (!usuario || usuario.estado !== "activo")
    return { status: 403, error: "Usuario inactivo" };

  await refreshTokenRepository.revocarRefreshToken(refresh_token);
  const nuevo = await refreshTokenRepository.crearRefreshToken(
    usuario.id_usuario,
  );
  return {
    status: 200,
    body: {
      token: generarToken(usuario.id_usuario),
      refresh_token: nuevo,
      usuario: perfil(usuario),
    },
  };
};

export default {
  login,
  registrar,
  restablecerClave,
  verificarClaveUsuario,
  logout,
  refresh,
};
