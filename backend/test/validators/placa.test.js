// backend/test/validators/placa.test.js
import { test } from "node:test";
import assert from "node:assert/strict";
import { validarPlaca } from "../../src/validators/placa.js";

test("placa: valida formatos correctos", () => {
  assert.equal(validarPlaca("ABC123", "carro").valida, true);
  assert.equal(validarPlaca("ABC12D", "moto").valida, true);
});

test("placa: rechaza formatos incorrectos", () => {
  assert.equal(validarPlaca("ABC12", "carro").valida, false); // corto
  assert.equal(validarPlaca("123456", "moto").valida, false); // formato invalido moto
  assert.equal(validarPlaca("", "carro").valida, false); // vacio
});
