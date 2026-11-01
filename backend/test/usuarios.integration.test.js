import { test } from "node:test";
import assert from "node:assert/strict";
import { pool } from "../src/config/db.js";
import * as authService from "../src/services/authService.js";
import * as userServices from "../src/services/userServices.js";

function mockRes() {
  return { statusCode: 200, body: null, status(c) { this.statusCode = c; return this; }, json(d) { this.body = d; return this; } };
}

test("usuarios: registrar nuevo usuario", async () => {
  const res = await authService.registrar({
    rol: "operador",
    tipo_documento: "cc",
    documento: "9999999999",
    nombres: "Test",
    apellidos: "Usuario",
    telefono: "3009999999",
    email: "test.usuario@autoscolombia.com",
    usuario_login: "testuser",
    clave: "123456",
  });
  assert.equal(res.status, 201);
  assert.equal(res.body.usuario_login, "testuser");
});

test("usuarios: documento duplicado devuelve 409", async () => {
  const res = await authService.registrar({
    rol: "operador",
    tipo_documento: "cc",
    documento: "9999999999",
    nombres: "Otro",
    apellidos: "Usuario",
    telefono: "3008888888",
    email: "otro@autoscolombia.com",
    usuario_login: "otrouser",
    clave: "123456",
  });
  assert.equal(res.status, 409);
});

test("usuarios: listar usuarios devuelve resultados", async () => {
  const res = await userServices.listarUsuarios({ limit: 5 });
  assert.ok(Array.isArray(res.rows));
  assert.ok(res.total > 0);
});

test("usuarios: cambiar estado a inactivo limpia sesion", async () => {
  const [rows] = await pool.query("SELECT id_usuario FROM usuarios WHERE usuario_login = 'testuser'");
  const id = rows[0].id_usuario;
  const res = await userServices.cambiarEstadoUsuario(id, "inactivo");
  assert.equal(res.status, 200);

  const [u] = await pool.query("SELECT estado, sesion_activa FROM usuarios WHERE id_usuario = ?", [id]);
  assert.equal(u[0].estado, "inactivo");
  assert.equal(u[0].sesion_activa, 0);
});

test("usuarios: restablecer clave", async () => {
  const [rows] = await pool.query("SELECT id_usuario FROM usuarios WHERE usuario_login = 'testuser'");
  const id = rows[0].id_usuario;
  const res = await authService.restablecerClave({ idUsuario: id, claveNueva: "654321" });
  assert.equal(res.status, 200);
});

test("cleanup: eliminar usuario de prueba", async () => {
  await pool.query("DELETE FROM usuarios WHERE usuario_login = 'testuser'");
  await pool.end();
});