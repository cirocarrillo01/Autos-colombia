import { test } from "node:test";
import assert from "node:assert/strict";
import { pool } from "../src/config/db.js";
import * as authService from "../src/services/authService.js";
import { verificarToken } from "../src/middleware/authMiddleware.js";

test("setup: limpiar intentos de login", async () => {
  await pool.query("DELETE FROM login_attempts WHERE usuario_login = 'operador'");
});

test("auth: login exitoso devuelve token", async () => {
  const res = await authService.login(
    { headers: { "x-forwarded-for": "127.0.0.1" } },
    { usuario_login: "operador", clave: "123456" },
  );
  assert.equal(res.status, 200);
  assert.ok(res.body.token);
  assert.ok(res.body.refresh_token);
  assert.equal(res.body.usuario.usuario_login, "operador");
});

test("auth: login fallido devuelve 401", async () => {
  const res = await authService.login(
    { headers: { "x-forwarded-for": "127.0.0.1" } },
    { usuario_login: "operador", clave: "clave_incorrecta" },
  );
  assert.equal(res.status, 401);
});

test("auth: logout revoca el token", async () => {
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
  assert.equal(logout.status, 200);
  // Verificar que el token está revocado
  const { query } = await import("../src/config/db.js");
  const rows = await query(
    "SELECT jti FROM revoked_tokens WHERE jti = ?",
    [decoded.jti],
  );
  assert.equal(rows.length, 1);
});

// Limpieza
test("cleanup: cerrar sesiones de prueba", async () => {
  await pool.query("DELETE FROM revoked_tokens WHERE id_usuario = 1");
  await pool.query("UPDATE usuarios SET sesion_activa = FALSE WHERE id_usuario = 1");
  await pool.end();
});