// frontend/e2e/celdas.spec.js
import { test, expect } from "@playwright/test";

test.describe("E2E Celdas & Mantenimiento", () => {
  test.beforeEach(async ({ page }) => {
    // Capture console logs for debugging
    page.on('console', msg => console.log('[PAGE CONSOLE]', msg.text()));
    page.on('pageerror', err => console.log('[PAGE ERROR]', err.message));

    await page.addInitScript(() => {
      const originalFetch = window.fetch;
      window.fetch = async (url, options = {}) => {
        const urlStr = url.toString();
        console.log('[MOCK FETCH] Intercepted:', urlStr);
        
        if (urlStr.includes('/api/auth/me')) {
          return new Response(JSON.stringify({
            id_usuario: 1,
            usuario_login: "admin",
            rol: "administrador",
            nombres: "Admin",
            apellidos: "Sistema",
            nombreCompleto: "Admin Sistema",
            email: "admin@autocolombia.com",
            telefono: "1234567890",
            estado: "activo"
          }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }
        
        if (urlStr.includes('/api/celdas/resumen')) {
          return new Response(JSON.stringify({ totales: { total: 5, libres: 4, ocupadas: 1, no_disponibles: 0 } }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }
        
        if (urlStr.includes('/api/celdas/bloques')) {
          return new Response(JSON.stringify([{ bloque: "A", celdas: [{ id_celda: 1, codigo: "A1", tipo: "Carro", estado: "libre" }] }]), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }
        
        if (urlStr.includes('/api/celdas/tipos')) {
          console.log('[MOCK FETCH] Mocking celdas/tipos');
          return new Response(JSON.stringify([{ id_tipo_vehiculo: 1, nombre: "Carro" }]), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }
        
        if (urlStr.includes('/api/tipos-vehiculo')) {
          return new Response(JSON.stringify({
            rows: [
              { id_celda: 1, codigo: "A1", tipo: "Carro", estado: "libre", activa: true },
              { id_celda: 2, codigo: "A2", tipo: "Carro", estado: "ocupada", activa: true, placa_ocupante: "XYZ999" }
            ],
            total: 2
          }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }
        
        if (urlStr.includes('/api/auth/refresh')) {
          return new Response(JSON.stringify({ token: 'new-fake-jwt' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }
        
        if (urlStr.includes('/api/')) {
          return new Response(JSON.stringify({ success: true, rows: [], total: 0 }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }
        
        return originalFetch(url, options);
      };
    });
  });

  test("debería navegar a la gestión de celdas y ver los registros", async ({ page }) => {
    await page.goto("/celdas");
    await page.waitForLoadState('networkidle');

    // Debug: check what h2 elements exist
    const h2Texts = await page.locator('h2').allTextContents();
    console.log('h2 texts found:', h2Texts);

    await expect(page.locator("h2")).toContainText("Celdas");
    await expect(page.locator("text=A1")).toBeVisible();
    await expect(page.locator("text=A2")).toBeVisible();
  });

  test("debería abrir el modal de crear celda", async ({ page }) => {
    await page.goto("/celdas");
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: /crear celda/i }).click({ force: true });
    await expect(page.getByRole('dialog')).toBeVisible();
  });
});