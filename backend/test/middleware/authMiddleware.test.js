// backend/test/middleware/authMiddleware.test.js
import { test } from "node:test";
import assert from "node:assert/strict";
import { autenticar } from "../../src/middleware/authMiddleware.js";

function mockRes() {
  return {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(data) { this.body = data; return this; },
  };
}

test("authMiddleware: sin token devuelve 401", async () => {
  const req = { headers: {} };
  const res = mockRes();
  let nextCalled = false;
  const next = () => { nextCalled = true; };

  await autenticar(req, res, next);
  assert.equal(res.statusCode, 401);
  assert.equal(nextCalled, false);
});