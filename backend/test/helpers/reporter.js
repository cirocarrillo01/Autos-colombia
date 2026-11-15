// backend/test/helpers/reporter.js
import fs from 'fs/promises';
import path from 'path';

/**
 * Sanitiza datos sensibles antes de guardar evidencia.
 */
const sanitizar = (data) => {
  const clone = JSON.parse(JSON.stringify(data));
  if (clone && typeof clone === 'object') {
    if (clone.token) clone.token = '[REDACTED]';
    if (clone.refresh_token) clone.refresh_token = '[REDACTED]';
    if (clone.body) {
      if (clone.body.token) clone.body.token = '[REDACTED]';
      if (clone.body.refresh_token) clone.body.refresh_token = '[REDACTED]';
      if (clone.body.clave) clone.body.clave = '[REDACTED]';
      if (clone.body.claveAdmin) clone.body.claveAdmin = '[REDACTED]';
    }
  }
  return clone;
};

/**
 * Guarda la respuesta de una prueba en un archivo JSON dentro de docs/test-results/
 * @param {string} testId - ID del caso de prueba (ej: CE-11)
 * @param {Object} data - Objeto de respuesta o error a guardar
 */
export const guardarEvidencia = async (testId, data) => {
  const dir = path.join(process.cwd(), 'docs', 'test-results');
  try {
    await fs.mkdir(dir, { recursive: true });
    const safeData = sanitizar(data);
    await fs.writeFile(
      path.join(dir, `${testId}.json`),
      JSON.stringify(safeData, null, 2)
    );
    console.log(`✅ Evidencia guardada para ${testId}: docs/test-results/${testId}.json`);
  } catch (err) {
    console.error(`❌ Error al guardar evidencia para ${testId}:`, err);
  }
};
