// backend/test/middleware/roleMiddleware.test.js
// Tests unitarios para el middleware de autorización por rol.

import { test } from "node:test";
import assert from "node:assert/strict";
import { autorizarRoles } from "../../src/middleware/roleMiddleware.js";

function mockRes() {
  return {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(data) { this.body = data; return this; },
  };
}

// ── Sin req.user ────────────────────────────────────────────────────

test("roleMiddleware: sin req.user devuelve 401", () => {
  const mw = autorizarRoles("administrador");
  const req = {};
  const res = mockRes();
  let nextCalled = false;

  mw(req, res, () => { nextCalled = true; });
  assert.equal(res.statusCode, 401);
  assert.match(res.body.error, /autenticación/i);
  assert.equal(nextCalled, false);
});

// ── Rol no autorizado ───────────────────────────────────────────────

test("roleMiddleware: rol no autorizado devuelve 403", () => {
  const mw = autorizarRoles("administrador");
  const req = { user: { rol: "operador" } };
  const res = mockRes();
  let nextCalled = false;

  mw(req, res, () => { nextCalled = true; });
  assert.equal(res.statusCode, 403);
  assert.match(res.body.error, /permisos/i);
  assert.equal(nextCalled, false);
});

// ── Rol autorizado pasa ─────────────────────────────────────────────

test("roleMiddleware: rol autorizado llama next()", () => {
  const mw = autorizarRoles("administrador", "operador");
  const req = { user: { rol: "operador" } };
  const res = mockRes();
  let nextCalled = false;

  mw(req, res, () => { nextCalled = true; });
  assert.equal(nextCalled, true);
  assert.equal(res.statusCode, 200); // no cambió
});

// ── Múltiples roles ─────────────────────────────────────────────────

test("roleMiddleware: administrador pasa en lista con múltiples roles", () => {
  const mw = autorizarRoles("administrador", "operador");
  const req = { user: { rol: "administrador" } };
  const res = mockRes();
  let nextCalled = false;

  mw(req, res, () => { nextCalled = true; });
  assert.equal(nextCalled, true);
});

// ── Rol vacío ───────────────────────────────────────────────────────

test("roleMiddleware: sin roles permitidos nadie pasa", () => {
  const mw = autorizarRoles();
  const req = { user: { rol: "administrador" } };
  const res = mockRes();
  let nextCalled = false;

  mw(req, res, () => { nextCalled = true; });
  assert.equal(res.statusCode, 403);
  assert.equal(nextCalled, false);
});

// ── Rol undefined en req.user ───────────────────────────────────────

test("roleMiddleware: req.user.rol undefined devuelve 403", () => {
  const mw = autorizarRoles("administrador");
  const req = { user: { rol: undefined } };
  const res = mockRes();
  let nextCalled = false;

  mw(req, res, () => { nextCalled = true; });
  assert.equal(res.statusCode, 403);
  assert.equal(nextCalled, false);
});

// ── Rol con case distinto no pasa (case-sensitive) ──────────────────

test("roleMiddleware: rol es case-sensitive ('Administrador' ≠ 'administrador')", () => {
  const mw = autorizarRoles("administrador");
  const req = { user: { rol: "Administrador" } };
  const res = mockRes();
  let nextCalled = false;

  mw(req, res, () => { nextCalled = true; });
  assert.equal(res.statusCode, 403);
  assert.equal(nextCalled, false);
});
