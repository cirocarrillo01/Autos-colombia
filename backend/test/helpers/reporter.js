// backend/test/helpers/reporter.js
import fs from 'fs/promises';
import path from 'path';

/**
 * Guarda la respuesta de una prueba en un archivo JSON dentro de docs/test-results/
 * @param {string} testId - ID del caso de prueba (ej: CE-11)
 * @param {Object} data - Objeto de respuesta o error a guardar
 */
export const guardarEvidencia = async (testId, data) => {
  const dir = path.join(process.cwd(), 'docs', 'test-results');
  try {
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(
      path.join(dir, `${testId}.json`), 
      JSON.stringify(data, null, 2)
    );
    console.log(`✅ Evidencia guardada para ${testId}: docs/test-results/${testId}.json`);
  } catch (err) {
    console.error(`❌ Error al guardar evidencia para ${testId}:`, err);
  }
};
