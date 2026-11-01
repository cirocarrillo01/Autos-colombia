import { test } from "node:test";
import assert from "node:assert/strict";
import { generarToken, verificarToken } from "../src/middleware/authMiddleware.js";

test("generarToken y verificarToken: id_usuario se preserva", () => {
  const token = generarToken(42);
  const decoded = verificarToken(token);
  assert.equal(decoded.id_usuario, 42);
  assert.ok(decoded.jti);
  assert.ok(decoded.exp > decoded.iat);
});

test("verificarToken: token invalido lanza error", () => {
  assert.throws(() => verificarToken("token.invalido.aqui"), /JsonWebTokenError|invalid/);
});