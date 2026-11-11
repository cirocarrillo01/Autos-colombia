// frontend/e2e/auth.spec.js
import { test, expect } from "@playwright/test";

// Usamos un archivo propio sin storageState para probar el login explícitamente
test.use({ storageState: { cookies: [], origins: [] } });

test.describe("E2E Authentication & Flows", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      const originalFetch = window.fetch;
      window.fetch = async (url, options = {}) => {
        const urlStr = url.toString();
        
        if (urlStr.includes('/api/auth/login')) {
          return new Response(JSON.stringify({
            token: 'fake-jwt',
            refresh_token: 'fake-refresh',
            usuario: {
              id_usuario: 1,
              usuario_login: "admin",
              rol: "administrador",
              nombres: "Admin",
              apellidos: "Sistema",
              nombreCompleto: "Admin Sistema",
              email: "admin@autocolombia.com",
              telefono: "1234567890",
              estado: "activo"
            }
          }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }
        
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
        
        if (urlStr.includes('/api/auth/refresh')) {
          return new Response(JSON.stringify({ token: 'new-fake-jwt' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }
        
        if (urlStr.includes('/api/celdas/resumen')) {
          return new Response(JSON.stringify({ totales: { total: 10, libres: 10 } }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }
        
        if (urlStr.includes('/api/')) {
          return new Response(JSON.stringify({ success: true, rows: [], total: 0 }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }
        
        return originalFetch(url, options);
      };
    });
  });

  test("debería mostrar la página de login y permitir autenticación", async ({ page }) => {
    await page.goto("/login");

    // Verificar elementos del login
    await expect(page.locator("h1")).toHaveText("Auto Colombia");
    
    // Rellenar credenciales de prueba
    await page.fill("#usuario_login", "admin");
    await page.fill("#clave", "admin123");
    
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/.*dashboard/);
  });
});