//backend/src/middleware/validation.js
// Helpers de validación de cuerpo de solicitud para las rutas de usuarios.

export const REQUIRED_USER_FIELDS = [
  "rol",
  "tipo_documento",
  "documento",
  "nombres",
  "apellidos",
  "usuario_login",
  "clave",
];

export const VALID_ROLES = ["administrador", "operador"];
export const VALID_TIPOS_DOCUMENTO = ["cc", "ce", "nit", "pasaporte"];

/**
 * Valida los campos obligatorios de un registro/actualización de usuario.
 * @param {Object} body 
 * @param {Object} options - { requiereClave?: boolean }
 * @returns {string|null} null si es válido, mensaje de error si no.
 */
export const validarDatosUsuario = (body, { requiereClave = true } = {}) => {
  if (!body || typeof body !== "object") return "Cuerpo de solicitud inválido";

  const obligatorios = requiereClave
    ? REQUIRED_USER_FIELDS
    : REQUIRED_USER_FIELDS.filter((c) => c !== "clave");

  for (const campo of obligatorios) {
    const valor = body[campo];
    if (valor === undefined || valor === null || valor === "") {
      return `El campo "${campo}" es obligatorio`;
    }
  }
  if (!VALID_ROLES.includes(body.rol)) {
    return `Rol inválido. Debe ser uno de: ${VALID_ROLES.join(", ")}`;
  }
  if (!VALID_TIPOS_DOCUMENTO.includes(body.tipo_documento)) {
    return `Tipo de documento inválido. Debe ser uno de: ${VALID_TIPOS_DOCUMENTO.join(", ")}`;
  }
  if (String(body.documento).length < 5 || String(body.documento).length > 20) {
    return "El documento debe tener entre 5 y 20 caracteres";
  }
  if (String(body.usuario_login).length < 3) {
    return "El usuario de acceso debe tener al menos 3 caracteres";
  }
  if (requiereClave && String(body.clave).length < 4) {
    return "La clave debe tener al menos 4 caracteres";
  }
  if (body.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(body.email))) {
    return "El correo electrónico no tiene un formato válido";
  }
  return null;
};

/**
 * Valida que una nueva clave cumpla el mínimo.
 * @param {string} clave 
 * @returns {string|null}
 */
export const validarClave = (clave) => {
  if (!clave || String(clave).length < 4) {
    return "La clave debe tener al menos 4 caracteres";
  }
  return null;
};

export default {
  validarDatosUsuario,
  validarClave,
  REQUIRED_USER_FIELDS,
  VALID_ROLES,
  VALID_TIPOS_DOCUMENTO,
};