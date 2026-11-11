// Validación de cuerpo para rutas de usuarios (única fuente; authService ya no la repite).
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
const EMAIL = /^[^\s@]+@[^\s@.]+\.[^\s@]+$/;

export const validarClave = (clave) =>
  !clave || String(clave).length < 4
    ? "La clave debe tener al menos 4 caracteres"
    : null;

export const validarDatosUsuario = (body, { requiereClave = true } = {}) => {
  if (!body || typeof body !== "object") return "Cuerpo de solicitud inválido";
  const obligatorios = requiereClave
    ? REQUIRED_USER_FIELDS
    : REQUIRED_USER_FIELDS.filter((c) => c !== "clave");
  for (const campo of obligatorios) {
    const v = body[campo];
    if (v === undefined || v === null || String(v).trim() === "")
      return `El campo "${campo}" es obligatorio`;
  }
  if (!VALID_ROLES.includes(body.rol))
    return `Rol inválido. Debe ser uno de: ${VALID_ROLES.join(", ")}`;
  if (!VALID_TIPOS_DOCUMENTO.includes(body.tipo_documento)) {
    return `Tipo de documento inválido. Debe ser uno de: ${VALID_TIPOS_DOCUMENTO.join(", ")}`;
  }
  const doc = String(body.documento).length;
  if (doc < 5 || doc > 20)
    return "El documento debe tener entre 5 y 20 caracteres";
  if (String(body.usuario_login).length < 3)
    return "El usuario de acceso debe tener al menos 3 caracteres";
  if (requiereClave) {
    const e = validarClave(body.clave);
    if (e) return e;
  }
  if (body.email && !EMAIL.test(String(body.email)))
    return "El correo electrónico no tiene un formato válido";
  return null;
};
