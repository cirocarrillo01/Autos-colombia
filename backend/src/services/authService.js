// backend/src/services/authService.js
// Lógica de negocio de autenticación: registro, login, cambio/restablecimiento de clave,
// control de intentos fallidos (fuerza bruta) y registro de último acceso.
// Usa bcryptjs para cifrar claves y jsonwebtoken para los tokens de acceso.

import bcrypt from "bcryptjs";
import { generarToken, verificarToken } from "../middleware/authMiddleware.js";
import * as userRepository from "../repositories/userRepository.js";
import * as refreshTokenRepository from "../repositories/refreshTokenRepository.js";
import * as revokedTokenRepository from "../repositories/revokedTokenRepository.js";
import * as auditRepository from "../repositories/auditRepository.js";
import { query } from "../config/db.js";

const MAX_INTENTOS_FALLIDOS = 5;
const VENTANA_INTENTOS_MINUTOS = 15;

const obtenerIp = (req) => {
  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.ip || req.connection.remoteAddress || "desconocida";
};

const errorAuth = () => ({ status: 401, error: "Usuario o clave incorrectos" });

export const login = async (req, { usuario_login: loginCrudo, clave }) => {
  loginCrudo = String(loginCrudo ?? "")
    .trim()
    .slice(0, 40);

  if (!loginCrudo || !clave) {
    return { status: 400, error: "Usuario y clave son obligatorios" };
  }
  const ip = obtenerIp(req);
  const fallidosUsuario = await userRepository.contarFallidosRecientes({
    usuario_login: loginCrudo,
    minutos: VENTANA_INTENTOS_MINUTOS,
  });
  const fallidosIp = await userRepository.contarFallidosRecientes({
    ip_address: ip,
    minutos: VENTANA_INTENTOS_MINUTOS,
  });
  if (
    fallidosUsuario >= MAX_INTENTOS_FALLIDOS ||
    fallidosIp >= MAX_INTENTOS_FALLIDOS
  ) {
    await userRepository.registrarIntento({
      usuario_login: loginCrudo,
      exitoso: false,
      ip_address: ip,
    });
    return {
      status: 423,
      error:
        "Acceso bloqueado temporalmente por múltiples intentos fallidos. Intente más tarde.",
    };
  }

  const usuario = await userRepository.findByLogin(loginCrudo);
  if (!usuario) {
    await userRepository.registrarIntento({
      usuario_login: loginCrudo,
      exitoso: false,
      ip_address: ip,
    });
    return errorAuth();
  }

  if (usuario.estado !== "activo") {
    await userRepository.registrarIntento({
      usuario_login: loginCrudo,
      exitoso: false,
      ip_address: ip,
    });
    return {
      status: 403,
      error: "Usuario inactivo. No puede iniciar sesión.",
    };
  }

  const coincide = await bcrypt.compare(String(clave), usuario.clave_hash);
  if (!coincide) {
    await userRepository.registrarIntento({
      usuario_login: loginCrudo,
      exitoso: false,
      ip_address: ip,
    });
    return errorAuth();
  }

  // Éxito: registramos intento exitoso, actualizamos último acceso y activamos sesión.
  await userRepository.registrarIntento({
    usuario_login: loginCrudo,
    exitoso: true,
    ip_address: ip,
  });
  await userRepository.registrarUltimoAcceso(usuario.id_usuario);
  await userRepository.registrarSesionActiva(usuario.id_usuario);
  const token = generarToken(usuario.id_usuario);
  const refreshToken = await refreshTokenRepository.crearRefreshToken(
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
    body: {
      token,
      refresh_token: refreshToken,
      usuario: {
        id_usuario: usuario.id_usuario,
        usuario_login: usuario.usuario_login,
        rol: usuario.rol,
        nombres: usuario.nombres,
        apellidos: usuario.apellidos,
        nombreCompleto: `${usuario.nombres} ${usuario.apellidos}`,
        estado: usuario.estado,
      },
    },
  };
};

export const registrar = async (datos) => {
  const {
    rol,
    tipo_documento,
    documento,
    nombres,
    apellidos,
    telefono,
    email,
    usuario_login,
    clave,
  } = datos;

  if (String(documento).length < 5 || String(documento).length > 20) {
    return {
      status: 400,
      error: "El documento debe tener entre 5 y 20 caracteres",
    };
  }
  if (String(clave).length < 4) {
    return { status: 400, error: "La clave debe tener al menos 4 caracteres" };
  }

  const duplicado = await userRepository.findDuplicate({
    tipo_documento,
    documento,
    usuario_login,
    email: email || undefined,
  });
  if (duplicado) {
    let campo = "";
    if (
      duplicado.tipo_documento === tipo_documento &&
      duplicado.documento === documento
    )
      campo = "documento";
    else if (duplicado.usuario_login === usuario_login)
      campo = "usuario de acceso";
    else if (email && duplicado.email === email) campo = "correo";
    return {
      status: 409,
      error: `Ya existe un usuario registrado con ese ${campo}.`,
    };
  }

  const clave_hash = await bcrypt.hash(String(clave), 10);

  const { insertId } = await userRepository.create({
    rol,
    tipo_documento,
    documento,
    nombres,
    apellidos,
    telefono,
    email,
    usuario_login,
    clave_hash,
  });

  const creado = await userRepository.findById(insertId);
  return {
    status: 201,
    body: {
      id_usuario: creado.id_usuario,
      usuario_login: creado.usuario_login,
      rol: creado.rol,
      nombres: creado.nombres,
      apellidos: creado.apellidos,
      email: creado.email,
    },
  };
};

export const restablecerClave = async ({ idUsuario, claveNueva }) => {
  const usuario = await userRepository.findById(idUsuario);
  if (!usuario) {
    return { status: 404, error: "Usuario no encontrado" };
  }

  const clave_hash = await bcrypt.hash(String(claveNueva), 10);
  await userRepository.cambiarClave(idUsuario, clave_hash);
  return {
    status: 200,
    body: {
      mensaje: `Clave restablecida para el usuario ${usuario.usuario_login}`,
    },
  };
};

// Re-autenticación: valida la clave del usuario identificado por usuario_login.
// Se usa para confirmar que el administrador que realiza cambios en otros
// usuarios (p. ej. restablecer clave o editar datos) sea quien está autenticado
// y no una sesión dejada abierta.
export const verificarClaveUsuario = async ({ usuario_login, clave }) => {
  const usuario = await userRepository.findByLogin(usuario_login);
  if (!usuario) return { status: 404, error: "Usuario no encontrado" };
  const coincide = await bcrypt.compare(String(clave), usuario.clave_hash);
  if (!coincide) return { status: 400, error: "La clave es incorrecta" };
  return { status: 200, body: { ok: true } };
};

export const logout = async ({ idUsuario, token }) => {
  const usuario = await userRepository.findById(idUsuario);
  if (token) {
    try {
      const decoded = verificarToken(token);
      if (decoded?.jti && decoded?.exp) {
        await revokedTokenRepository.revocarToken({
          jti: decoded.jti,
          id_usuario: idUsuario,
          expires_at: new Date(decoded.exp * 1000),
        });
      }
    } catch (e) {
      console.log("LOGOUT revoke error", e.message);
    }
  }
  await refreshTokenRepository.revocarRefreshTokensUsuario(idUsuario);
  await query(
    `UPDATE usuarios SET sesion_activa = FALSE, fecha_sesion_activa = NULL WHERE id_usuario = ?`,
    [idUsuario],
  );
  await auditRepository.registrarAudit({
    id_usuario: idUsuario,
    usuario_login: usuario?.usuario_login ?? null,
    accion: "LOGOUT",
    recurso: "auth",
    detalle: "Cierre de sesión",
    ip_address: "desconocida",
  });
  return { status: 200, body: { ok: true } };
};
export const refresh = async ({ refresh_token }) => {
  if (!refresh_token) {
    return { status: 400, error: "Refresh token requerido" };
  }
  const row = await refreshTokenRepository.validarRefreshToken(refresh_token);
  if (!row) {
    return { status: 401, error: "Refresh token inválido o expirado" };
  }
  // Rotar: revocar el anterior y emitir uno nuevo
  await refreshTokenRepository.revocarRefreshToken(refresh_token);
  const newRefresh = await refreshTokenRepository.crearRefreshToken(
    row.id_usuario,
  );
  const usuario = await userRepository.findById(row.id_usuario);
  if (!usuario || usuario.estado !== "activo") {
    return { status: 403, error: "Usuario inactivo" };
  }
  const token = generarToken(usuario.id_usuario);
  return {
    status: 200,
    body: {
      token,
      refresh_token: newRefresh,
      usuario: {
        id_usuario: usuario.id_usuario,
        usuario_login: usuario.usuario_login,
        rol: usuario.rol,
        nombres: usuario.nombres,
        apellidos: usuario.apellidos,
        nombreCompleto: `${usuario.nombres} ${usuario.apellidos}`,
        estado: usuario.estado,
      },
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
