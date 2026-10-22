// backend/src/validators/placa.js
// ============================================================================
// VALIDACIÓN DE PLACAS - AUTO COLOMBIA
// ============================================================================
// Formatos de placa soportados en Colombia (sin 구분ador ni con guion):
//   - Carro:  3 letras + 3 números  -> ABC123   (ABC-123)
//   - Moto:   3 letras + 2 números + 1 letra -> ABC12C (ABC12C / ABC-12C)
//
// Reglas:
//   - La placa se normaliza a MAYÚSCULAS y sin espacios.
//   - Se acepta el guion opcional como separador (ABC-123 / ABC-12C).
//   - El tipo de vehículo determina el formato válido; si no se conoce el
//     tipo se validan ambos formatos.
// ============================================================================

export const FORMATOS_POR_TIPO = {
  carro: /^([A-Z]{3})-?([0-9]{3})$/,
  moto: /^([A-Z]{3})-?([0-9]{2})([A-Z])$/,
};

// Formatos admitidos cuando el tipo de vehículo todavía no se conoce.
export const FORMATOS = [FORMATOS_POR_TIPO.carro, FORMATOS_POR_TIPO.moto];

/**
 * Normaliza una placa: mayúsculas, sin espacios y sin guiones.
 */
export const normalizarPlaca = (placa) =>
  String(placa ?? "")
    .trim()
    .toUpperCase()
    .replace(/[\s-]/g, "");

/**
 * Indica si una placa cumple el formato del tipo de vehículo indicado.
 * @param {string} placa
 * @param {"carro"|"moto"|null} tipo - null o undefined valida ambos formatos.
 */
export const esPlacaValida = (placa, tipo = null) => {
  const p = normalizarPlaca(placa);
  if (!p) return false;
  if (tipo && FORMATOS_POR_TIPO[tipo]) {
    return FORMATOS_POR_TIPO[tipo].test(p);
  }
  return FORMATOS.some((re) => re.test(p));
};

/**
 * Valida la placa y devuelve un resultado con el detalle del error.
 * @returns {{ valida: boolean, placa: string, tipo: string|null, error: string|null }}
 */
export const validarPlaca = (placa, tipo = null) => {
  const p = normalizarPlaca(placa);
  if (!p) {
    return { valida: false, placa: p, tipo, error: "La placa es obligatoria" };
  }

  const tipoDetectado = p.match(FORMATOS_POR_TIPO.moto) ? "moto" : "carro";

  if (tipo && FORMATOS_POR_TIPO[tipo]) {
    if (!FORMATOS_POR_TIPO[tipo].test(p)) {
      return {
        valida: false,
        placa: p,
        tipo,
        error:
          tipo === "moto"
            ? "Formato de placa inválido para moto. Ejemplo: ABC12C"
            : "Formato de placa inválido para carro. Ejemplo: ABC123",
      };
    }
    return { valida: true, placa: p, tipo, error: null };
  }

  if (!FORMATOS.some((re) => re.test(p))) {
    return {
      valida: false,
      placa: p,
      tipo,
      error:
        "Formato de placa inválido. Ejemplo: ABC123 (carro) o ABC12C (moto)",
    };
  }

  return { valida: true, placa: p, tipo: tipoDetectado, error: null };
};