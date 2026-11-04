import { test } from "node:test";
import assert from "node:assert/strict";
import { pool } from "../src/config/db.js";
import * as authService from "../src/services/authService.js";
import * as userServices from "../src/services/userServices.js";

function mockRes() {
  return { statusCode: 200, body: null, status(c) { this.statusCode = c; return this; }, json(d) { this.body = d; return this; } };
}

test("usuarios: registrar usuario sin claveAdmin falla (re-auth)", async () => {
  // Simulación del controlador
  const req = {
    user: { usuario_login: "admin" }, // Suponemos que el admin está logueado
    body: {
      rol: "operador",
      tipo_documento: "cc",
      documento: "1111111111",
      nombres: "Nuevo",
      apellidos: "User",
      telefono: "3001111111",
      email: "nuevo@autoscolombia.com",
      usuario_login: "nuevouser",
      clave: "123456",
      // Falta claveAdmin
    },
  };
  const res = mockRes();
  
  // Como no podemos llamar directamente al controlador porque depende de Express,
  // verificamos que authService.registrar NO se llama sin el filtro de re-auth.
  // La brecha cerrada está en el controlador. Aquí verificamos el flujo.
  // Dado que el controlador ahora requiere claveAdmin, si no lo enviamos, deberia fallar.
  // Vamos a probar la integración del controlador llamándolo manualmente:
  
  const { register } = await import("../src/controllers/authController.js");
  await register(req, res);
  assert.equal(res.statusCode, 401);
});

test("usuarios: registrar usuario con claveAdmin incorrecta falla", async () => {
  const req = {
    user: { usuario_login: "administrador" }, // El usuario 'administrador' existe en la BD con clave '123456'
    body: {
      rol: "operador",
      tipo_documento: "cc",
      documento: "2222222222",
      nombres: "Otro",
      apellidos: "User",
      telefono: "3002222222",
      email: "otro@autoscolombia.com",
      usuario_login: "otrouser",
      clave: "123456",
      claveAdmin: "incorrecta",
    },
  };
  const res = mockRes();
  const { register } = await import("../src/controllers/authController.js");
  await register(req, res);
  assert.equal(res.statusCode, 401);
});

test("usuarios: registrar usuario con claveAdmin correcta exitoso", async () => {
  const req = {
    user: { usuario_login: "admin" }, // En la BD existe 'admin' con clave '123456'
    body: {
      rol: "operador",
      tipo_documento: "cc",
      documento: "3333333333",
      nombres: "Valido",
      apellidos: "User",
      telefono: "3003333333",
      email: "valido@autoscolombia.com",
      usuario_login: "validouser",
      clave: "123456",
      claveAdmin: "123456",
    },
  };
  const res = mockRes();
  const { register } = await import("../src/controllers/authController.js");
  await register(req, res);
  assert.equal(res.statusCode, 201);
});

test("usuarios: documento duplicado devuelve 409", async () => {
  const req = {
    user: { usuario_login: "admin" },
    body: {
      rol: "operador",
      tipo_documento: "cc",
      documento: "3333333333",
      nombres: "Otro",
      apellidos: "Usuario",
      telefono: "3008888888",
      email: "otro@autoscolombia.com",
      usuario_login: "otrouser",
      clave: "123456",
      claveAdmin: "123456",
    },
  };
  const res = mockRes();
  const { register } = await import("../src/controllers/authController.js");
  await register(req, res);
  assert.equal(res.statusCode, 409);
});

test("usuarios: cambiar estado a inactivo limpia sesion", async () => {
  const [rows] = await pool.query("SELECT id_usuario FROM usuarios WHERE usuario_login = 'validouser'");
  const id = rows[0].id_usuario;
  const res = await userServices.cambiarEstadoUsuario(id, "inactivo");
  assert.equal(res.status, 200);

  const [u] = await pool.query("SELECT estado, sesion_activa FROM usuarios WHERE id_usuario = ?", [id]);
  assert.equal(u[0].estado, "inactivo");
  assert.equal(u[0].sesion_activa, 0);
});

test("usuarios: restablecer clave", async () => {
  const [rows] = await pool.query("SELECT id_usuario FROM usuarios WHERE usuario_login = 'validouser'");
  const id = rows[0].id_usuario;
  const res = await authService.restablecerClave({ idUsuario: id, claveNueva: "654321" });
  assert.equal(res.status, 200);
});

test("cleanup: eliminar usuario de prueba", async () => {
  await pool.query("DELETE FROM usuarios WHERE usuario_login IN ('validouser', 'otrouser')");
  await pool.end();
});