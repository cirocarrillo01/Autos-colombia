// backend/test/middleware/authMiddleware.extended.test.js
// Tests unitarios extendidos del middleware de autenticación JWT.

import { test } from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import {
  autenticar,
  generarToken,
  verificarToken,
} from "../../src/middleware/authMiddleware.js";

const JWT_SECRET = process.env.JWT_SECRET;

function mockRes() {
  return {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(data) { this.body = data; return this; },
  };
}

// ── generarToken ────────────────────────────────────────────────────

test("generarToken: el token contiene jti (UUID)", () => {
  const token = generarToken(42);
  const decoded = jwt.decode(token);
  assert.ok(decoded.jti, "Token debe tener jti");
  assert.match(decoded.jti, /^[0-9a-f-]{36}$/i, "jti debe ser UUID");
});

test("generarToken: tokens distintos para mismo usuario", () => {
  const t1 = generarToken(1);
  const t2 = generarToken(1);
  assert.notEqual(t1, t2, "Cada token debe ser único");
});

test("generarToken: id_usuario se preserva para valores distintos", () => {
  for (const id of [0, 1, 999, -1]) {
    const decoded = verificarToken(generarToken(id));
    assert.equal(decoded.id_usuario, id);
  }
});

// ── verificarToken ──────────────────────────────────────────────────

test("verificarToken: token expirado lanza TokenExpiredError", () => {
  const token = jwt.sign({ id_usuario: 1, jti: "test" }, JWT_SECRET, {
    expiresIn: "0s",
  });
  // Necesitamos que pase un tick para que expire
  assert.throws(() => verificarToken(token), {
    name: "TokenExpiredError",
  });
});

test("verificarToken: token con secret incorrecto lanza error", () => {
  const token = jwt.sign({ id_usuario: 1 }, "secret_incorrecto", {
    expiresIn: "1h",
  });
  assert.throws(() => verificarToken(token), {
    name: "JsonWebTokenError",
  });
});

test("verificarToken: string vacío lanza error", () => {
  assert.throws(() => verificarToken(""), {
    name: "JsonWebTokenError",
  });
});

test("verificarToken: null lanza error", () => {
  assert.throws(() => verificarToken(null), {
    name: "JsonWebTokenError",
  });
});

// ── autenticar middleware ────────────────────────────────────────────

test("autenticar: sin header Authorization devuelve 401", async () => {
  const req = { headers: {} };
  const res = mockRes();
  let nextCalled = false;
  await autenticar(req, res, () => { nextCalled = true; });
  assert.equal(res.statusCode, 401);
  assert.equal(nextCalled, false);
});

test("autenticar: Authorization sin 'Bearer' devuelve 401", async () => {
  const req = { headers: { authorization: "Basic abc123" } };
  const res = mockRes();
  let nextCalled = false;
  await autenticar(req, res, () => { nextCalled = true; });
  assert.equal(res.statusCode, 401);
  assert.match(res.body.error, /token/i);
  assert.equal(nextCalled, false);
});

test("autenticar: 'Bearer' sin token devuelve 401", async () => {
  const req = { headers: { authorization: "Bearer " } };
  const res = mockRes();
  let nextCalled = false;
  await autenticar(req, res, () => { nextCalled = true; });
  assert.equal(res.statusCode, 401);
  assert.equal(nextCalled, false);
});

test("autenticar: token malformado devuelve 401 con 'Token inválido'", async () => {
  const req = { headers: { authorization: "Bearer token.invalido.xyz" } };
  const res = mockRes();
  let nextCalled = false;
  await autenticar(req, res, () => { nextCalled = true; });
  assert.equal(res.statusCode, 401);
  assert.match(res.body.error, /inválido/i);
  assert.equal(nextCalled, false);
});

test("autenticar: token expirado devuelve 401 con 'Sesión expirada'", async () => {
  const token = jwt.sign({ id_usuario: 1, jti: "test-exp" }, JWT_SECRET, {
    expiresIn: "0s",
  });
  const req = { headers: { authorization: `Bearer ${token}` } };
  const res = mockRes();
  let nextCalled = false;
  await autenticar(req, res, () => { nextCalled = true; });
  assert.equal(res.statusCode, 401);
  assert.match(res.body.error, /expirada/i);
  assert.equal(nextCalled, false);
});

test("autenticar: header con tres partes 'Bearer x y' devuelve 401", async () => {
  const req = { headers: { authorization: "Bearer part1 part2" } };
  const res = mockRes();
  let nextCalled = false;
  await autenticar(req, res, () => { nextCalled = true; });
  assert.equal(res.statusCode, 401);
  assert.equal(nextCalled, false);
});

test("autenticar: header vacío devuelve 401", async () => {
  const req = { headers: { authorization: "" } };
  const res = mockRes();
  let nextCalled = false;
  await autenticar(req, res, () => { nextCalled = true; });
  assert.equal(res.statusCode, 401);
  assert.equal(nextCalled, false);
});
