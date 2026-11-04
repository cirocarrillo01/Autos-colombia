//frontend/src/features/auth/context/authUtils.js
// Utilidades internas de autenticación (no exportadas como componentes).

/**
 * Guarda o elimina el usuario en localStorage.
 * @param {Object|null} u - Objeto usuario o null.
 */
export const guardarUsuario = (u) =>
  u
    ? localStorage.setItem("ac_user", JSON.stringify(u))
    : localStorage.removeItem("ac_user");