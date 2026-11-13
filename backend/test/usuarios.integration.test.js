import { test } from "node:test";
import assert from "node:assert/strict";
import { pool } from "../src/config/db.js";
import { guardarEvidencia } from "./helpers/reporter.js";
import * as authService from "../src/services/authService.js";
import * as userServices from "../src/services/userServices.js";

function mockRes() {
  return {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(data) { this.body = data; return this; },
  };
}

function assertExito(res, statusCode = 200, mensajeContiene = null) {
  assert.strictEqual(res.statusCode, statusCode, `Se esperaba status ${statusCode}, se obtuvo ${res.statusCode}`);
  assert.ok(res.body, "El cuerpo de respuesta no debe ser nulo en caso de éxito");
  assert.strictEqual(!!res.body.error, false, "En caso de éxito no debe existir campo 'error'");
  if (mensajeContiene) {
    assert.ok(res.body.mensaje, "El cuerpo de éxito debe contener 'mensaje'");
    assert.match(String(res.body.mensaje), new RegExp(mensajeContiene, "i"));
  }
}

function assertError(res, statusCode, errorContiene = null) {
  assert.strictEqual(res.statusCode, statusCode, `Se esperaba status ${statusCode}, se obtuvo ${res.statusCode}`);
  assert.ok(res.body, "El cuerpo de respuesta no debe ser nulo en caso de error");
  assert.ok(res.body.error, "El cuerpo de error debe contener campo 'error'");
  assert.strictEqual(!!res.body.mensaje, false, "En caso de error no debe existir campo 'mensaje'");
  if (errorContiene) {
    assert.match(String(res.body.error), new RegExp(errorContiene, "i"));
  }
}

test("US-01: Login admin real", async () => {
  const req = { body: { usuario_login: "admin", clave: "123456" } };
  const res = mockRes();
  const { login } = await import("../src/controllers/authController.js");
  await login(req, res);
  await guardarEvidencia("US-01", { status: res.statusCode, body: res.body });
});

test("US-04: Login campos vacíos", async () => {
  const req = { body: { usuario_login: "", clave: "" } };
  const res = mockRes();
  const { login } = await import("../src/controllers/authController.js");
  await login(req, res);
  await guardarEvidencia("US-04", { status: res.statusCode, body: res.body });
  assertError(res, 400, "obligatorios");
});

test("US-11: Registro con rol inválido", async () => {
  const req = {
    user: { usuario_login: "admin" },
    body: {
      rol: "superadmin",
      tipo_documento: "cc",
      documento: "99999999",
      nombres: "Test",
      apellidos: "User",
      usuario_login: "testsuper",
      clave: "123456",
      claveAdmin: "123456"
    }
  };
  const res = mockRes();
  const { register } = await import("../src/controllers/authController.js");
  await register(req, res);
  await guardarEvidencia("US-11", { status: res.statusCode, body: res.body });
  assertError(res, 422, "Rol no reconocido");
});

test("usuarios: registrar usuario sin claveAdmin devuelve 422 con error", async () => {
  const req = {
    user: { usuario_login: "admin" },
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
    },
  };
  const res = mockRes();
  const { register } = await import("../src/controllers/authController.js");
  await register(req, res);
  assertError(res, 422, "clave de administrador");
});

test("usuarios: registrar usuario con claveAdmin incorrecta devuelve 403 con error", async () => {
  const req = {
    user: { usuario_login: "administrador" },
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
  assertError(res, 403, "clave de administrador incorrecta");
});

test("usuarios: registrar usuario con claveAdmin correcta devuelve 201 con mensaje", async () => {
  const req = {
    user: { usuario_login: "admin" },
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
  await guardarEvidencia("US-07", { status: res.statusCode, body: res.body });
  assertExito(res, 201);
});

test("usuarios: documento duplicado devuelve 409 con error", async () => {
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
  await guardarEvidencia("US-09", { status: res.statusCode, body: res.body });
  assertError(res, 409, "ya existe");
});

test("usuarios: cambiar estado a inactivo limpia sesion", async () => {
  const [rows] = await pool.query("SELECT id_usuario FROM usuarios WHERE usuario_login = 'validouser'");
  const id = rows[0].id_usuario;
  const res = await userServices.cambiarEstadoUsuario(id, "inactivo");
  assert.strictEqual(res.status, 200);

  const [u] = await pool.query("SELECT estado, sesion_activa FROM usuarios WHERE id_usuario = ?", [id]);
  assert.strictEqual(u[0].estado, "inactivo");
  assert.strictEqual(u[0].sesion_activa, 0);
});

test("US-12: Verificar hash en BD y ausencia en respuesta", async () => {
  const [rows] = await pool.query("SELECT clave_hash FROM usuarios WHERE usuario_login = 'validouser'");
  const hash = rows[0].clave_hash;
  // Verificar que sea un hash válido (bcrypt, argon2, etc.) y no texto plano
  assert.ok(hash && hash.length > 20 && !hash.includes("123456"), "Hash debe ser un hash válido, no texto plano");
  
  const { obtenerUsuario } = await import("../src/services/userServices.js");
  const [user] = await pool.query("SELECT usuario_login, id_usuario FROM usuarios WHERE usuario_login = 'validouser'");
  const res = await obtenerUsuario(user[0].id_usuario);
  assert.ok(!res.body.clave_hash, "Respuesta no debe contener clave_hash");
  
  await guardarEvidencia("US-12", { hash: hash.substring(0, 10) + "...", tieneHashEnRespuesta: !!res.body.clave_hash });
});

test("US-10: Registro con campos obligatorios faltantes → 422", async () => {
  const camposObligatorios = [
    "rol", "tipo_documento", "documento", "nombres", "apellidos", 
    "usuario_login", "clave", "claveAdmin"
  ];
  
  for (const campo of camposObligatorios) {
    const body = {
      rol: "operador",
      tipo_documento: "cc",
      documento: "4444444444",
      nombres: "Test",
      apellidos: "User",
      usuario_login: `testus10_${campo}`,
      clave: "123456",
      claveAdmin: "123456" // Agregado para que no falle por falta de claveAdmin
    };
    delete body[campo];
    
    const req = { user: { usuario_login: "admin" }, body };
    const res = mockRes();
    const { register } = await import("../src/controllers/authController.js");
    await register(req, res);
    // Ahora debería fallar por el campo faltante, no por claveAdmin
    assert.ok([400, 422].includes(res.statusCode), `Esperaba 400/422 por campo faltante, obtuve ${res.statusCode}`);
  }
  
  // Caso adicional: nombres solo espacios
  const req = { 
    user: { usuario_login: "admin" }, 
    body: {
      rol: "operador",
      tipo_documento: "cc",
      documento: "5555555555",
      nombres: "   ",
      apellidos: "User",
      usuario_login: "testespacios",
      clave: "123456",
      claveAdmin: "123456"
    }
  };
  const res = mockRes();
  const { register } = await import("../src/controllers/authController.js");
  await register(req, res);
  await guardarEvidencia("US-10", { status: res.statusCode, body: res.body });
  assertError(res, 422, "obligatorio");
});

test("usuarios: restablecer clave devuelve 200 con mensaje", async () => {
  const [rows] = await pool.query("SELECT id_usuario FROM usuarios WHERE usuario_login = 'validouser'");
  const id = rows[0].id_usuario;
  const res = await authService.restablecerClave({ idUsuario: id, claveNueva: "654321" });
  assert.strictEqual(res.status, 200);
});

test("cleanup: eliminar usuario de prueba", async () => {
  await pool.query("DELETE FROM usuarios WHERE usuario_login IN ('validouser', 'otrouser')");
  await pool.end();
});
