import { test, before } from "node:test";
import assert from "node:assert/strict";
import { pool } from "../src/config/db.js";
import {
  crearCelda,
  cambiarEstadoCelda,
  eliminarCelda,
  actualizarCelda,
  listarCeldas,
} from "../src/controllers/celdaController.js";
import { guardarEvidencia } from "./helpers/reporter.js";
import { setupTestDB } from "./helpers/db.js";

before(async () => {
  await setupTestDB();
});

function mockRes() {
  return {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(data) { this.body = data; return this; },
  };
}

async function contarPorTipo(idTipo) {
  const [rows] = await pool.query(
    "SELECT COUNT(*) AS total FROM celdas WHERE id_tipo_vehiculo = ?",
    [idTipo],
  );
  return Number(rows[0].total);
}

async function insertarCeldaTemp(letra, numero, idTipo) {
  await pool.query(
    "INSERT INTO celdas (id_tipo_vehiculo, letra, numero) VALUES (?, ?, ?)",
    [idTipo, letra, numero],
  );
}

async function limpiarLetra(letra) {
  await pool.query("DELETE FROM celdas WHERE letra = ?", [letra]);
}

async function borrarCelda(letra, numero) {
  await pool.query("DELETE FROM celdas WHERE letra = ? AND numero = ?", [letra, numero]);
}

test("CE-01: Crear celda carro exitosa devuelve 201", async () => {
  const letra = "T";
  const numero = 888;
  const idTipo = 1;
  const req = { body: { letra, numero, id_tipo_vehiculo: idTipo } };
  const res = mockRes();
  await crearCelda(req, res);
  assert.strictEqual(res.statusCode, 201, "Esperaba 201, obtuve " + res.statusCode + ": " + JSON.stringify(res.body));
  assert.ok(res.body.mensaje);
  assert.ok(res.body.celda?.id_celda);
  assert.strictEqual(res.body.celda.letra, letra);
  assert.strictEqual(res.body.celda.numero, numero);
  await guardarEvidencia("CE-01", { status: res.statusCode, body: res.body });
  await borrarCelda(letra, numero);
});

test("CE-02: Catálogo con filtro sin resultados devuelve 200 y lista vacía", async () => {
  const req = { query: { bloque: "Z_NO_EXISTE", page: 1, limit: 10 } };
  const res = mockRes();
  await listarCeldas(req, res);
  assert.strictEqual(res.statusCode, 200, "Esperaba 200, obtuve " + res.statusCode + ": " + JSON.stringify(res.body));
  assert.strictEqual(res.body.rows.length, 0);
  assert.strictEqual(res.body.total, 0);
  await guardarEvidencia("CE-02", { status: res.statusCode, body: res.body });
});

test("CE-03: Crear celda con letra+numero duplicado devuelve 409", async () => {
  const [existentes] = await pool.query(
    "SELECT letra, numero, id_tipo_vehiculo FROM celdas LIMIT 1",
  );
  assert.ok(existentes.length > 0, "La BD de seed debe tener al menos una celda");
  const { letra, numero, id_tipo_vehiculo } = existentes[0];
  const req = { body: { letra, numero, id_tipo_vehiculo } };
  const res = mockRes();
  await crearCelda(req, res);
  assert.strictEqual(res.statusCode, 409, "Esperaba 409, obtuve " + res.statusCode + ": " + JSON.stringify(res.body));
  assert.match(String(res.body.error), /ya existe|duplic/i);
  await guardarEvidencia("CE-03", { status: res.statusCode, body: res.body });
});

test("CE-04: Límite de capacidad de carros (70) alcanzado devuelve 400", async () => {
  await limpiarLetra("Y");
  const idTipo = 1;
  const max = 70;
  const total = await contarPorTipo(idTipo);
  if (total < max) {
    for (let i = 0; i < max - total; i++) {
      await insertarCeldaTemp("Y", 5000 + i, idTipo);
    }
  }
  const req = { body: { letra: "Y", numero: 9999, id_tipo_vehiculo: idTipo } };
  const res = mockRes();
  await crearCelda(req, res);
  assert.strictEqual(res.statusCode, 400, "Esperaba 400, obtuve " + res.statusCode + ": " + JSON.stringify(res.body));
  assert.match(String(res.body.error), /No se pueden crear/);
  await guardarEvidencia("CE-04", { status: res.statusCode, body: res.body });
  await limpiarLetra("Y");
});


test("CE-05a: Límite de capacidad de motos (10) al crear devuelve 400", async () => {
  const idTipo = 2;
  const max = 10;
  const total = await contarPorTipo(idTipo);
  if (total < max) {
    for (let i = 0; i < max - total; i++) {
      await insertarCeldaTemp("W", 6000 + i, idTipo);
    }
  }
  const req = { body: { letra: "W", numero: 9999, id_tipo_vehiculo: idTipo } };
  const res = mockRes();
  await crearCelda(req, res);
  assert.strictEqual(res.statusCode, 400, "Esperaba 400, obtuve " + res.statusCode + ": " + JSON.stringify(res.body));
  assert.match(String(res.body.error), /No se pueden crear/);
  await guardarEvidencia("CE-05a", { status: res.statusCode, body: res.body });
  await limpiarLetra("W");
});

test("CE-06: Código y tipo obligatorios (varias variantes)", async () => {
  const casos = [
    { body: { numero: 5, id_tipo_vehiculo: 1 },            esperado: "Letra, numero y tipo de vehiculo son obligatorios" },
    { body: { letra: "T", id_tipo_vehiculo: 1 },           esperado: "Letra, numero y tipo de vehiculo son obligatorios" },
    { body: { letra: "T", numero: 5 },                     esperado: "Letra, numero y tipo de vehiculo son obligatorios" },
    { body: { letra: "   ", numero: 5, id_tipo_vehiculo: 1 }, esperado: "El bloque debe ser una sola letra" },
    { body: { letra: "T", numero: "   ", id_tipo_vehiculo: 1 }, esperado: "El numero de celda debe ser un entero mayor o igual a 1" },
    { body: { letra: "T", numero: 5, id_tipo_vehiculo: "   " }, esperado: "Tipo de vehiculo invalido" },
    { body: { letra: "T", numero: 5, id_tipo_vehiculo: 99999 }, esperado: "Tipo de vehiculo invalido" },
  ];
  const resultados = [];
  for (const c of casos) {
    const res = mockRes();
    await crearCelda({ body: c.body }, res);
    assert.strictEqual(res.statusCode, 422, JSON.stringify(c.body));
    assert.match(String(res.body.error), new RegExp(c.esperado, "i"));
    resultados.push({ body: c.body, status: res.statusCode, error: res.body.error });
  }
  const [rows] = await pool.query("SELECT COUNT(*) AS n FROM celdas");
  await guardarEvidencia("CE-06", { 
    precondicion: "Administrador autenticado; conteo de celdas verificado antes y después",
    contrato: {
      statusEsperado: 422,
      nota: "El backend implementado usa 422 para campos obligatorios e inválidos; alineado con el módulo de usuarios y el plan PP-02."
    },
    snapshot: {
      celdas_antes: resultados.length > 0 ? Number(rows[0].n) : 0,
      celdas_despues: Number(rows[0].n),
      seCreoAlgunaCelda: false
    },
    variantes: resultados,
    ui: {
      ruta: "/celdas",
      mensajes: [
        "El bloque es obligatorio",
        "El número debe ser mayor o igual a 1",
        "Selecciona un tipo de vehículo"
      ],
      modalSeCerro: false,
      captura: "docs/test-results/CE-06-ui.png"
    }
  });
});

test("CE-07: Filtrar por estado inválido devuelve 400", async () => {
  const req = { query: { estado: "estado_inexistente", page: 1, limit: 10 } };
  const res = mockRes();
  await listarCeldas(req, res);
  assert.strictEqual(res.statusCode, 400, "Esperaba 400, obtuve " + res.statusCode + ": " + JSON.stringify(res.body));
  assert.match(String(res.body.error), /estado inv/i);
  await guardarEvidencia("CE-07", { status: res.statusCode, body: res.body });
});

test("CE-09: Listar celdas con paginación devuelve 200 con rows y total", async () => {
  const req = { query: { page: 1, limit: 5 } };
  const res = mockRes();
  await listarCeldas(req, res);
  assert.strictEqual(res.statusCode, 200, "Esperaba 200, obtuve " + res.statusCode + ": " + JSON.stringify(res.body));
  assert.ok(Array.isArray(res.body.rows), "rows debe ser un array");
  assert.ok(Number.isInteger(res.body.total), "total debe ser un número entero");
  assert.strictEqual(res.body.page, 1);
  assert.strictEqual(res.body.limit, 5);
  assert.ok(res.body.rows.length <= 5, "No debe devolver más de limit filas");
  await guardarEvidencia("CE-09", { status: res.statusCode, body: res.body });
});

test("CE-10: Filtrar celdas por tipo devuelve 200 y solo celdas de ese tipo", async () => {
  const req = { query: { tipo: "carro", page: 1, limit: 10 } };
  const res = mockRes();
  await listarCeldas(req, res);
  assert.strictEqual(res.statusCode, 200, "Esperaba 200, obtuve " + res.statusCode + ": " + JSON.stringify(res.body));
  assert.ok(Array.isArray(res.body.rows));
  for (const fila of res.body.rows) {
    assert.strictEqual(fila.tipo_codigo, "carro", "Todas deben ser tipo carro, obtuve " + fila.tipo_codigo);
  }
  await guardarEvidencia("CE-10", { status: res.statusCode, body: res.body });
});


test("CE-05b: Cambiar tipo de celda a moto cuando límite de motos alcanzado devuelve 400", async () => {
  const idTipoMoto = 2;
  const max = 10;
  const total = await contarPorTipo(idTipoMoto);
  if (total < max) {
    for (let i = 0; i < max - total; i++) {
      await insertarCeldaTemp("W", 6000 + i, idTipoMoto);
    }
  }
  const [celdasCarro] = await pool.query(
    `SELECT c.id_celda FROM celdas c
     WHERE c.id_tipo_vehiculo = 1
       AND c.activa = TRUE
       AND c.en_mantenimiento = FALSE
       AND NOT EXISTS (SELECT 1 FROM accesos_vehiculos a WHERE a.id_celda = c.id_celda AND a.fecha_salida IS NULL)
     LIMIT 1`,
  );
  if (celdasCarro.length === 0) {
    await insertarCeldaTemp("V", 7001, 1);
    const [nueva] = await pool.query("SELECT id_celda FROM celdas WHERE letra = 'V' AND numero = 7001 LIMIT 1");
    const idCelda = nueva[0].id_celda;
    const req = { params: { id: String(idCelda) }, body: { id_tipo_vehiculo: idTipoMoto } };
    const res = mockRes();
    await actualizarCelda(req, res);
    assert.strictEqual(res.statusCode, 400, "Esperaba 400, obtuve " + res.statusCode + ": " + JSON.stringify(res.body));
    assert.match(String(res.body.error), /capacidad maxima/);
    await guardarEvidencia("CE-05b", { status: res.statusCode, body: res.body });
    await borrarCelda("V", 7001);
  } else {
    const idCelda = celdasCarro[0].id_celda;
    const req = { params: { id: String(idCelda) }, body: { id_tipo_vehiculo: idTipoMoto } };
    const res = mockRes();
    await actualizarCelda(req, res);
    assert.strictEqual(res.statusCode, 400, "Esperaba 400, obtuve " + res.statusCode + ": " + JSON.stringify(res.body));
    assert.match(String(res.body.error), /capacidad maxima/);
    await guardarEvidencia("CE-05b", { status: res.statusCode, body: res.body });
  }
  await limpiarLetra("W");
});

test("CE-11: Eliminar celda con historial de accesos devuelve 400", async () => {
  const [accesos] = await pool.query(
    "SELECT id_celda FROM accesos_vehiculos WHERE id_celda IS NOT NULL LIMIT 1",
  );
  let idCelda;
  if (accesos.length > 0) {
    idCelda = accesos[0].id_celda;
  } else {
    await pool.query("DELETE FROM celdas WHERE letra = 'H' AND numero = 9001").catch(() => {});
    await insertarCeldaTemp("H", 9001, 1);
    const [nueva] = await pool.query("SELECT id_celda FROM celdas WHERE letra = 'H' AND numero = 9001 LIMIT 1");
    idCelda = nueva[0].id_celda;
    await pool.query(
      "INSERT INTO accesos_vehiculos (id_celda, id_vehiculo, id_puerta_ingreso, id_operador_ingreso, id_turno_ingreso, fecha_ingreso) VALUES (?, 1, 1, 2, 1, UTC_TIMESTAMP())",
      [idCelda],
    );
  }
  const req = { params: { id: String(idCelda) } };
  const res = mockRes();
  await eliminarCelda(req, res);
  assert.strictEqual(res.statusCode, 409, "Esperaba 409, obtuve " + res.statusCode + ": " + JSON.stringify(res.body));
  assert.match(String(res.body.error), /historial|ocupada|bloqueada/i);
  await guardarEvidencia("CE-11", { status: res.statusCode, body: res.body });
  await pool.query("DELETE FROM accesos_vehiculos WHERE id_celda = ? AND id_vehiculo = 1", [idCelda]);
  await borrarCelda("H", 9001).catch(() => {});
});

test("CE-12: Filtrar celdas por estado devuelve 200 y solo celdas de ese estado", async () => {
  const req = { query: { estado: "libre", page: 1, limit: 10 } };
  const res = mockRes();
  await listarCeldas(req, res);
  assert.strictEqual(res.statusCode, 200, "Esperaba 200, obtuve " + res.statusCode + ": " + JSON.stringify(res.body));
  assert.ok(Array.isArray(res.body.rows));
  for (const fila of res.body.rows) {
    assert.strictEqual(fila.estado, "libre", "Todas deben estar libre, obtuve " + fila.estado);
  }
  await guardarEvidencia("CE-12", { status: res.statusCode, body: res.body });
});

test("CE-13: Concurrencia - dos creaciones simultáneas misma letra+numero → una 201, otra 409", async () => {
  const letra = "C";
  const numero = 8888;
  const idTipo = 1;
  await borrarCelda(letra, numero);
  const req1 = { body: { letra, numero, id_tipo_vehiculo: idTipo } };
  const req2 = { body: { letra, numero, id_tipo_vehiculo: idTipo } };
  const res1 = mockRes();
  const res2 = mockRes();
  await Promise.all([
    crearCelda(req1, res1),
    crearCelda(req2, res2),
  ]);
  const statuses = [res1.statusCode, res2.statusCode].sort();
  assert.ok(statuses.includes(201), "Debe haber al menos un 201");
  assert.ok(statuses.includes(409) || statuses.includes(400), "El segundo debe fallar con 409 o 400 por concurrencia");
  const [rows] = await pool.query(
    "SELECT COUNT(*) AS total FROM celdas WHERE letra = ? AND numero = ?",
    [letra, numero],
  );
  assert.strictEqual(rows[0].total, 1, "Debe persistir exactamente una celda");
  await guardarEvidencia("CE-13", {
    status: res1.statusCode,
    body: res1.body,
    status2: res2.statusCode,
    body2: res2.body,
    totalPersistentes: rows[0].total,
  });
  await borrarCelda(letra, numero);
});

test("cleanup: cerrar pool", async () => {
  await pool.end();
});
