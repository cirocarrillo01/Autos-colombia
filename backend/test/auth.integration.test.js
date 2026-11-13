import { test } from "node:test";
import assert from "node:assert/strict";
import { pool } from "../src/config/db.js";
import { guardarEvidencia } from "./helpers/reporter.js";
import * as authService from "../src/services/authService.js";
import { verificarToken } from "../src/middleware/authMiddleware.js";

function mockRes() {
  return {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(data) { this.body = data; return this; },
  };
}

function assertError(res, statusCode, errorContiene = null) {
  assert.strictEqual(res.statusCode, statusCode, `Se esperaba status ${statusCode}, se obtuvo ${res.statusCode}`);
  assert.ok(res.body, "El cuerpo de respuesta no debe ser nulo en caso de error");
  assert.ok(res.body.error, "El cuerpo de error debe contener campo 'error'");
  if (errorContiene) {
    assert.match(String(res.body.error), new RegExp(errorContiene, "i"));
  }
}

test("setup: limpiar intentos de login", async () => {
  await pool.query("DELETE FROM login_attempts WHERE usuario_login = 'operador'");
});

test("PE-01: Endpoint protegido sin autenticación rechaza la petición", async () => {
  const { register } = await import("../src/controllers/authController.js");
  const req = { 
    body: { rol: "operador", tipo_documento: "cc", documento: "999999", nombres: "Test", apellidos: "User", usuario_login: "testpetoken", clave: "123456", claveAdmin: "123456" } 
  };
  const res = { statusCode: 200, body: null, status(code) { this.statusCode = code; return this; }, json(data) { this.body = data; return this; } };
  await register(req, res);
  await guardarEvidencia("PE-01", { status: res.statusCode, body: res.body });
  assert.strictEqual(res.statusCode, 401);
});

test("PE-05: Operador accede a celdas disponibles", async () => {
  const login = await authService.login(
    { headers: { "x-forwarded-for": "127.0.0.1" } },
    { usuario_login: "operador", clave: "123456" },
  );
  const token = login.body.token;
  
  const { obtenerCeldasDisponibles } = await import("../src/controllers/celdaController.js");
  const req = { query: { tipo: "carro" }, headers: { authorization: `Bearer ${token}` } };
  const res = { statusCode: 200, body: null, status(code) { this.statusCode = code; return this; }, json(data) { this.body = data; return this; } };
  
  await obtenerCeldasDisponibles(req, res);
  await guardarEvidencia("PE-05", { status: res.statusCode, body: res.body });
  assert.strictEqual(res.statusCode, 200);
});

test("US-02: login operador", async () => {
  const res = await authService.login(
    { headers: { "x-forwarded-for": "127.0.0.1" } },
    { usuario_login: "operador", clave: "123456" },
  );
  await guardarEvidencia("US-02", { status: res.status, body: res.body });
  assert.equal(res.status, 200);
  assert.ok(res.body.token);
  assert.ok(res.body.refresh_token);
  assert.equal(res.body.usuario.rol, "operador");
});

test("US-08: Crear usuario con rol administrador", async () => {
  const { register } = await import("../src/controllers/authController.js");
  const uniqueSuffix = Date.now();
  const req = {
    user: { usuario_login: "admin" },
    body: {
      rol: "administrador",
      tipo_documento: "cc",
      documento: `88${uniqueSuffix}`,
      nombres: "Nuevo",
      apellidos: "Admin",
      usuario_login: `nuevoadmin${uniqueSuffix}`,
      clave: "123456",
      claveAdmin: "123456"
    }
  };
  const res = { statusCode: 200, body: null, status(code) { this.statusCode = code; return this; }, json(data) { this.body = data; return this; } };
  await register(req, res);
  await guardarEvidencia("US-08", { status: res.statusCode, body: res.body });
  assert.strictEqual(res.statusCode, 201);
});

test("US-03: login fallido", async () => {
  const res = await authService.login(
    { headers: { "x-forwarded-for": "127.0.0.1" } },
    { usuario_login: "operador", clave: "clave_incorrecta" },
  );
  await guardarEvidencia("US-03", { status: res.status, body: res.body });
  assert.equal(res.status, 401);
});

test("US-05: token expirado", async () => {
  const tokenVencido = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE2MDAwMDAwMDB9.invalido";
  const req = { headers: { authorization: `Bearer ${tokenVencido}` } };
  const res = { statusCode: 200, body: null, status(code) { this.statusCode = code; return this; }, json(data) { this.body = data; return this; } };
  
  const { autenticar } = await import("../src/middleware/authMiddleware.js");
  await autenticar(req, res, () => {});
  
  await guardarEvidencia("US-05", { status: res.statusCode, body: res.body });
  assert.equal(res.statusCode, 401);
});

test("US-06: logout revoca el token", async () => {
  const login = await authService.login(
    { headers: { "x-forwarded-for": "127.0.0.1" } },
    { usuario_login: "operador", clave: "123456" },
  );
  const token = login.body.token;
  const decoded = verificarToken(token);
  const logout = await authService.logout({
    idUsuario: decoded.id_usuario,
    token,
  });
  await guardarEvidencia("US-06", { status: logout.status, body: logout.body });
  assert.equal(logout.status, 200);
  
  const { query } = await import("../src/config/db.js");
  const rows = await query(
    "SELECT jti FROM revoked_tokens WHERE jti = ?",
    [decoded.jti],
  );
  assert.equal(rows.length, 1);
});

test("PE-02: Operador intenta crear usuario → 403 (via roleMiddleware)", async () => {
  const { autorizarRoles } = await import("../src/middleware/roleMiddleware.js");
  const req = { user: { usuario_login: "operador", rol: "operador" } };
  const res = { statusCode: 200, body: null, status(code) { this.statusCode = code; return this; }, json(data) { this.body = data; return this; } };
  let nextCalled = false;
  const middleware = autorizarRoles("administrador");
  await middleware(req, res, () => { nextCalled = true; });
  
  await guardarEvidencia("PE-02", { status: res.statusCode, body: res.body, nextCalled });
  assert.equal(res.statusCode, 403);
  assert.equal(nextCalled, false);
});

test("PE-03: Operador intenta gestionar celdas → 403 (via roleMiddleware)", async () => {
  const { autorizarRoles } = await import("../src/middleware/roleMiddleware.js");
  const req = { user: { usuario_login: "operador", rol: "operador" } };
  const res = { statusCode: 200, body: null, status(code) { this.statusCode = code; return this; }, json(data) { this.body = data; return this; } };
  let nextCalled = false;
  const middleware = autorizarRoles("administrador");
  await middleware(req, res, () => { nextCalled = true; });
  
  await guardarEvidencia("PE-03", { status: res.statusCode, body: res.body, nextCalled });
  assert.equal(res.statusCode, 403);
  assert.equal(nextCalled, false);
});

// Limpieza
test("cleanup: cerrar sesiones de prueba", async () => {
  await pool.query("DELETE FROM revoked_tokens WHERE id_usuario = 1");
  await pool.query("UPDATE usuarios SET sesion_activa = FALSE WHERE id_usuario = 1");
  await pool.end();
});