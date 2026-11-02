// frontend/src/services/api.js
// Cliente HTTP del backend con JWT y refresh automático.
import { normalizarPlaca } from "../validators/placa";

const API = import.meta.env.VITE_API_URL ?? "http://localhost:3000/api";
const TOKEN_KEY = "ac_token";
const REFRESH_KEY = "ac_refresh";

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t) =>
  t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY);
export const getRefreshToken = () => localStorage.getItem(REFRESH_KEY);
export const setRefreshToken = (t) =>
  t
    ? localStorage.setItem(REFRESH_KEY, t)
    : localStorage.removeItem(REFRESH_KEY);

const json = (method, body) => ({
  method,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

const qs = (obj = {}) => {
  const p = new URLSearchParams();
  Object.entries(obj).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") p.set(k, v);
  });
  const s = p.toString();
  return s ? `?${s}` : "";
};

/**
 * Intenta renovar el access token usando el refresh token guardado.
 * - Serializa las llamadas concurrentes: si 5 peticiones reciben 401 a la
 *   vez, solo se hace un POST /auth/refresh y las 5 esperan el mismo resultado.
 * - Lanza un error con `.status` para que el llamador decida si cerrar sesión.
 */
let refreshEnCurso = null;

const refrescarAccessToken = () => {
  if (refreshEnCurso) return refreshEnCurso;

  refreshEnCurso = (async () => {
    const refresh_token = getRefreshToken();
    if (!refresh_token) {
      throw Object.assign(new Error("No hay refresh token"), { status: 401 });
    }
    const res = await fetch(`${API}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token }),
    }).catch(() => {
      throw Object.assign(new Error("No se pudo conectar con el servidor"), {
        status: 0,
      });
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw Object.assign(
        new Error(data.error || "Refresh token inválido o expirado"),
        { status: res.status },
      );
    }
    const data = await res.json();
    setToken(data.token);
    setRefreshToken(data.refresh_token);
    return data.token;
  })();

  return refreshEnCurso.finally(() => {
    refreshEnCurso = null;
  });
};

/** Limpia tokens y avisa a AuthContext. Solo para 401/403 reales. */
const limpiarSesion = () => {
  setToken(null);
  setRefreshToken(null);
  window.dispatchEvent(new Event("auth:expired"));
};

async function pedir(url, opciones = {}, auth = true) {
  const headers = { ...(opciones.headers || {}) };
  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let res;
  try {
    res = await fetch(url, { ...opciones, headers });
  } catch {
    throw new Error("No se pudo conectar con el servidor");
  }

  // 401 en ruta autenticada + hay refresh guardado → renovar y reintentar UNA vez.
  if (res.status === 401 && auth && getRefreshToken()) {
    try {
      const nuevoToken = await refrescarAccessToken();
      headers.Authorization = `Bearer ${nuevoToken}`;
      res = await fetch(url, { ...opciones, headers });
    } catch (refreshErr) {
      // IMPORTANTE: un 429, 5xx o fallo de red en el refresh NO debe expulsar
      // al usuario. Solo cerramos sesión si el refresh fue rechazado (401/403).
      if (refreshErr?.status === 401 || refreshErr?.status === 403) {
        limpiarSesion();
      }
      const data = await res.json().catch(() => ({}));
      const err = new Error(
        data.error ||
          refreshErr?.message ||
          "Sesión expirada. Inicie sesión de nuevo.",
      );
      err.status = refreshErr?.status ?? 401;
      throw err;
    }
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const errorMessages = {
      401: "Credenciales incorrectas. Por favor, inicie sesión nuevamente.",
      403: "No tiene permiso para acceder a este recurso.",
      404: "El recurso solicitado no existe.",
      422: "Datos de validación incorrectos. Verifique la información ingresada.",
      429: "El servidor está ocupado. Reintentando en unos segundos…",
      500: "Error interno del servidor. Por favor, intente más tarde.",
    };
    if (res.status === 401 && auth) limpiarSesion();
    const errorMessage =
      data.error || errorMessages[res.status] || "Error en la solicitud";
    const error = new Error(errorMessage);
    error.status = res.status;
    throw error;
  }
  return data;
}

// ---------- Autenticación ----------
export const refreshToken = (refresh_token) =>
  pedir(`${API}/auth/refresh`, json("POST", { refresh_token }), false);
export const login = (usuario_login, clave) =>
  pedir(`${API}/auth/login`, json("POST", { usuario_login, clave }), false);
export const logout = () => pedir(`${API}/auth/logout`, json("POST", {}), true);
export const me = () => pedir(`${API}/auth/me`);

// ---------- Usuarios (RF1) ----------
export const listarUsuarios = (opts) => pedir(`${API}/users${qs(opts)}`);
export const obtenerUsuario = (id) => pedir(`${API}/users/${id}`);
export const registrarUsuario = (datos) =>
  pedir(`${API}/auth/register`, json("POST", datos));
export const editarUsuario = (id, datos) =>
  pedir(`${API}/users/${id}`, json("PUT", datos));
export const cambiarEstadoUsuario = (id, estado) =>
  pedir(`${API}/users/${id}/estado`, json("PATCH", { estado }));
export const verifyPassword = (clave) =>
  pedir(`${API}/auth/verify-password`, json("POST", { clave }));
export const restablecerClaveUsuario = (id, clave, claveAdmin) =>
  pedir(`${API}/users/${id}/password`, json("PATCH", { clave, claveAdmin }));

// ---------- Vehículos (RF2) ----------
export const listarVehiculos = (opts) => pedir(`${API}/vehiculos${qs(opts)}`);
export const buscarVehiculo = (placa) =>
  pedir(`${API}/vehiculos/${encodeURIComponent(normalizarPlaca(placa))}`);
export const crearVehiculo = (datos) =>
  pedir(`${API}/vehiculos`, json("POST", datos));
export const actualizarVehiculo = (placa, datos) =>
  pedir(
    `${API}/vehiculos/${encodeURIComponent(normalizarPlaca(placa))}`,
    json("PUT", datos),
  );
export const cambiarEstadoVehiculo = (placa, activo) =>
  pedir(
    `${API}/vehiculos/${encodeURIComponent(normalizarPlaca(placa))}/estado`,
    json("PATCH", { activo }),
  );

// ---------- Ingreso / salida ----------
export const obtenerCeldasDisponibles = (tipo) =>
  pedir(`${API}/celdas/disponibles${qs({ tipo })}`);

export const listarAccesos = (opts) =>
  pedir(`${API}/movimientos/historial${qs(opts)}`);

export const registrarMovimiento = ({ placa, celda, tipo }) =>
  pedir(
    `${API}/movimientos/${tipo}`,
    json(
      "POST",
      tipo === "salida" ? { placa } : { placa, id_celda: celda.id_celda },
    ),
  );

export const reubicarVehiculo = (idAcceso, idCeldaNueva) =>
  pedir(
    `${API}/movimientos/${idAcceso}/celda`,
    json("PATCH", { id_celda: idCeldaNueva }),
  );

// ---------- Celdas (RF3) ----------
export const listarCeldas = (opts) => pedir(`${API}/celdas${qs(opts)}`);
export const resumenCeldas = () => pedir(`${API}/celdas/resumen`);
export const celdasPorBloque = () => pedir(`${API}/celdas/bloques`);
export const eliminarCelda = (id) =>
  pedir(`${API}/celdas/${id}`, { method: "DELETE" });
export const listarTiposVehiculo = () => pedir(`${API}/celdas/tipos`);
export const crearCelda = (datos) =>
  pedir(`${API}/celdas`, json("POST", datos));
export const editarTipoCelda = (id, id_tipo_vehiculo) =>
  pedir(`${API}/celdas/${id}`, json("PUT", { id_tipo_vehiculo }));
export const cambiarEstadoCelda = (id, cambios) =>
  pedir(`${API}/celdas/${id}/estado`, json("PATCH", cambios));
