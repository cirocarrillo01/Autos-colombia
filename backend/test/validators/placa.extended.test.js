// backend/test/validators/placa.extended.test.js
// Tests exhaustivos para validators/placa.js — cubre esPlacaValida,
// normalizarPlaca con edge cases, y validarPlaca con detección de tipo.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  normalizarPlaca,
  esPlacaValida,
  validarPlaca,
  FORMATOS_POR_TIPO,
  FORMATOS,
} from "../../src/validators/placa.js";

// ── normalizarPlaca: edge cases ─────────────────────────────────────

test("normalizarPlaca: null retorna cadena vacía", () => {
  assert.equal(normalizarPlaca(null), "");
});

test("normalizarPlaca: undefined retorna cadena vacía", () => {
  assert.equal(normalizarPlaca(undefined), "");
});

test("normalizarPlaca: número se convierte a string", () => {
  assert.equal(normalizarPlaca(123), "123");
});

test("normalizarPlaca: elimina guiones y espacios", () => {
  assert.equal(normalizarPlaca("abc-123"), "ABC123");
  assert.equal(normalizarPlaca("abc 123"), "ABC123");
  assert.equal(normalizarPlaca("  abc - 123  "), "ABC123");
});

test("normalizarPlaca: convierte a mayúsculas", () => {
  assert.equal(normalizarPlaca("abc12c"), "ABC12C");
});

test("normalizarPlaca: cadena vacía retorna vacía", () => {
  assert.equal(normalizarPlaca(""), "");
});

test("normalizarPlaca: solo espacios y guiones retorna vacío", () => {
  assert.equal(normalizarPlaca("  - - "), "");
});

// ── esPlacaValida ───────────────────────────────────────────────────

test("esPlacaValida: carro válido sin tipo", () => {
  assert.equal(esPlacaValida("ABC123"), true);
});

test("esPlacaValida: moto válida sin tipo", () => {
  assert.equal(esPlacaValida("ABC12C"), true);
});

test("esPlacaValida: carro con guión", () => {
  assert.equal(esPlacaValida("ABC-123"), true);
});

test("esPlacaValida: placa inválida retorna false", () => {
  assert.equal(esPlacaValida("INVALID"), false);
  assert.equal(esPlacaValida("12AB34"), false);
  assert.equal(esPlacaValida(""), false);
});

test("esPlacaValida: carro con tipo 'carro' válido", () => {
  assert.equal(esPlacaValida("ABC123", "carro"), true);
});

test("esPlacaValida: moto con tipo 'moto' válido", () => {
  assert.equal(esPlacaValida("ABC12C", "moto"), true);
});

test("esPlacaValida: placa de carro con tipo 'moto' es inválida", () => {
  assert.equal(esPlacaValida("ABC123", "moto"), false);
});

test("esPlacaValida: placa de moto con tipo 'carro' es inválida", () => {
  assert.equal(esPlacaValida("ABC12C", "carro"), false);
});

test("esPlacaValida: null retorna false", () => {
  assert.equal(esPlacaValida(null), false);
});

test("esPlacaValida: undefined retorna false", () => {
  assert.equal(esPlacaValida(undefined), false);
});

test("esPlacaValida: tipo desconocido ('camion') valida contra todos", () => {
  // Si el tipo no existe en FORMATOS_POR_TIPO, la condición falla y usa FORMATOS
  assert.equal(esPlacaValida("ABC123", "camion"), true);
});

// ── validarPlaca: detección de tipo ─────────────────────────────────

test("validarPlaca: detecta tipo 'carro' automáticamente", () => {
  const r = validarPlaca("ABC123");
  assert.equal(r.valida, true);
  assert.equal(r.tipo, "carro");
  assert.equal(r.placa, "ABC123");
  assert.equal(r.error, null);
});

test("validarPlaca: detecta tipo 'moto' automáticamente", () => {
  const r = validarPlaca("ABC12C");
  assert.equal(r.valida, true);
  assert.equal(r.tipo, "moto");
});

test("validarPlaca: placa vacía retorna error obligatorio", () => {
  const r = validarPlaca("");
  assert.equal(r.valida, false);
  assert.match(r.error, /obligatoria/i);
});

test("validarPlaca: placa inválida retorna error de formato", () => {
  const r = validarPlaca("XXXYYY");
  assert.equal(r.valida, false);
  assert.match(r.error, /formato.*inválido/i);
});

test("validarPlaca: carro con tipo explícito moto retorna error", () => {
  const r = validarPlaca("ABC123", "moto");
  assert.equal(r.valida, false);
  assert.match(r.error, /moto/i);
});

test("validarPlaca: moto con tipo explícito carro retorna error", () => {
  const r = validarPlaca("ABC12C", "carro");
  assert.equal(r.valida, false);
  assert.match(r.error, /carro/i);
});

test("validarPlaca: placa con guión se normaliza", () => {
  const r = validarPlaca("abc-123");
  assert.equal(r.valida, true);
  assert.equal(r.placa, "ABC123");
  assert.equal(r.tipo, "carro");
});

test("validarPlaca: placa con minúsculas se normaliza", () => {
  const r = validarPlaca("abc12c");
  assert.equal(r.valida, true);
  assert.equal(r.placa, "ABC12C");
  assert.equal(r.tipo, "moto");
});

// ── FORMATOS_POR_TIPO: regex edge cases ─────────────────────────────

test("FORMATOS_POR_TIPO.carro: no permite 4 letras", () => {
  assert.equal(FORMATOS_POR_TIPO.carro.test("ABCD23"), false);
});

test("FORMATOS_POR_TIPO.carro: no permite 4 números", () => {
  assert.equal(FORMATOS_POR_TIPO.carro.test("ABC1234"), false);
});

test("FORMATOS_POR_TIPO.moto: no permite 3 números", () => {
  assert.equal(FORMATOS_POR_TIPO.moto.test("ABC123"), false);
  // ↑ Esto coincide con carro, no con moto
});

test("FORMATOS_POR_TIPO.moto: no permite 2 letras al final", () => {
  assert.equal(FORMATOS_POR_TIPO.moto.test("ABC12CD"), false);
});

// ── FORMATOS array tiene 2 regexps ──────────────────────────────────

test("FORMATOS contiene exactamente 2 formatos", () => {
  assert.equal(FORMATOS.length, 2);
});
