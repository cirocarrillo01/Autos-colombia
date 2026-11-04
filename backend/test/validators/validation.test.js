// backend/test/validators/validation.test.js
import { test } from "node:test";
import assert from "node:assert/strict";
import { validarClave, validarDatosUsuario } from "../../src/middleware/validation.js";

test("validarClave: rechaza claves muy cortas", () => {
  const result = validarClave("123");
  assert.ok(result !== null);
  assert.match(result, /al menos 4 caracteres/);
});

test("validarClave: acepta claves válidas", () => {
  const result = validarClave("1234");
  assert.equal(result, null);
});

test("validarDatosUsuario: valida campos obligatorios", () => {
  const result = validarDatosUsuario({});
  assert.ok(result !== null);
});

test("validarDatosUsuario: rechaza rol inválido", () => {
  const body = {
    rol: "invalido",
    tipo_documento: "cc",
    documento: "12345678",
    nombres: "Test",
    apellidos: "User",
    usuario_login: "test",
    clave: "1234"
  };
  const result = validarDatosUsuario(body);
  assert.match(result, /Rol inválido/);
});