// frontend/src/validators/documento.js
// Validador centralizado de documento de propietario (cédula numérica).
export const esDocumento = (t) => /^\d{5,20}$/.test(String(t ?? "").trim());

/**
 * Limpia puntos y espacios comunes de cédulas colombianas (ej. "1.234.567").
 * @param {string} t
 * @returns {string}
 */
export const limpiarDocumento = (t) =>
  String(t ?? "").replace(/[\.\s]/g, "").trim();