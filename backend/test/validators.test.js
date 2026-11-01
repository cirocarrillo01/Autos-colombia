import { test } from "node:test";
import assert from "node:assert/strict";
import { validarPlaca, normalizarPlaca } from "../src/validators/placa.js";

test("normalizarPlaca: mayusculas y sin guiones", () => {
  assert.equal(normalizarPlaca("abc-123"), "ABC123");
  assert.equal(normalizarPlaca("  mot 01 a "), "MOT01A");
});

test("validarPlaca carro valido", () => {
  const r = validarPlaca("abc123");
  assert.equal(r.valida, true);
  assert.equal(r.tipo, "carro");
  assert.equal(r.placa, "ABC123");
});

test("validarPlaca moto valida", () => {
  const r = validarPlaca("abc12c");
  assert.equal(r.valida, true);
  assert.equal(r.tipo, "moto");
});

test("validarPlaca invalida", () => {
  const r = validarPlaca("123abc");
  assert.equal(r.valida, false);
});

test("validarPlaca por tipo", () => {
  const r = validarPlaca("ABC123", "moto");
  assert.equal(r.valida, false);
});