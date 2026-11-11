// frontend/src/validators/placa.test.js
import { describe, it, expect } from "vitest";
import { validarPlaca, normalizarPlaca } from "../src/validators/placa.js";

describe("normalizarPlaca", () => {
  it("debería convertir a mayúsculas y quitar espacios/guiones", () => {
    expect(normalizarPlaca("abc 123")).toBe("ABC123");
    expect(normalizarPlaca("abc-123")).toBe("ABC123");
    expect(normalizarPlaca(" abc - 123 ")).toBe("ABC123");
  });

  it("debería manejar valores nulos o indefinidos", () => {
    expect(normalizarPlaca(null)).toBe("");
    expect(normalizarPlaca(undefined)).toBe("");
  });
});

describe("validarPlaca", () => {
  it("debería validar correctamente una placa de carro", () => {
    const resultado = validarPlaca("ABC-123", "carro");
    expect(resultado.valida).toBe(true);
    expect(resultado.tipo).toBe("carro");
  });

  it("debería validar correctamente una placa de moto", () => {
    const resultado = validarPlaca("ABC-12C", "moto");
    expect(resultado.valida).toBe(true);
    expect(resultado.tipo).toBe("moto");
  });

  it("debería detectar automáticamente el tipo si no se proporciona", () => {
    expect(validarPlaca("ABC123").tipo).toBe("carro");
    expect(validarPlaca("ABC12C").tipo).toBe("moto");
  });

  it("debería rechazar formatos inválidos", () => {
    expect(validarPlaca("AB123").valida).toBe(false);
    expect(validarPlaca("ABC1234").valida).toBe(false);
    expect(validarPlaca("").valida).toBe(false);
  });

  it("debería rechazar si el tipo no coincide", () => {
    expect(validarPlaca("ABC123", "moto").valida).toBe(false);
    expect(validarPlaca("ABC12C", "carro").valida).toBe(false);
  });
});
