// frontend/src/validators/placa.js
// Espejo de backend/src/validators/placa.js: da respuesta inmediata al usuario
// sin gastar una peticion.
//   - Carro: 3 letras + 3 numeros          -> ABC123  (ABC-123)
//   - Moto:  3 letras + 2 numeros + letra  -> ABC12C  (ABC-12C)

export const FORMATOS_POR_TIPO = {
  carro: /^([A-Z]{3})-?([0-9]{3})$/,
  moto: /^([A-Z]{3})-?([0-9]{2})([A-Z])$/,
};

export const FORMATOS = [FORMATOS_POR_TIPO.carro, FORMATOS_POR_TIPO.moto];

/** Normaliza una placa: mayusculas, sin espacios y sin guiones. */
export const normalizarPlaca = (placa) =>
  String(placa ?? "")
    .trim()
    .toUpperCase()
    .replace(/[\s-]/g, "");

/** @returns {{ valida: boolean, placa: string, tipo: string|null, error: string|null }} */
export const validarPlaca = (placa, tipo = null) => {
  const p = normalizarPlaca(placa);
  if (!p) {
    return { valida: false, placa: p, tipo, error: "La placa es obligatoria" };
  }

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
      error: "Formato inválido. Ejemplo: ABC123 (carro) o ABC12C (moto)",
    };
  }

  const tipoDetectado = FORMATOS_POR_TIPO.moto.test(p) ? "moto" : "carro";
  return { valida: true, placa: p, tipo: tipoDetectado, error: null };
};
