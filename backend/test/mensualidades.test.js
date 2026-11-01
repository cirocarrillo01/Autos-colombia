import { test } from "node:test";
import assert from "node:assert/strict";
import { pool } from "../src/config/db.js";
import { buscarVehiculoPorPlaca } from "../src/controllers/vehiculoController.js";

function mockReqRes(placa) {
  const req = { params: { placa } };
  const res = {
    statusCode: 200,
    body: null,
    status(c) { this.statusCode = c; return this; },
    json(d) { this.body = d; return this; },
  };
  return { req, res };
}

test("mensualidad: CAR001 esta al dia", async () => {
  const { req, res } = mockReqRes("CAR001");
  await buscarVehiculoPorPlaca(req, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.estadoMensualidad, "Al día");
});

test("mensualidad: CAR006 esta en mora", async () => {
  const { req, res } = mockReqRes("CAR006");
  await buscarVehiculoPorPlaca(req, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.estadoMensualidad, "En mora");
});

test("mensualidad: CAR007 sin mensualidad", async () => {
  const { req, res } = mockReqRes("CAR007");
  await buscarVehiculoPorPlaca(req, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.estadoMensualidad, "Sin mensualidad");
});

test("cleanup: cerrar pool", async () => {
  await pool.end();
});
