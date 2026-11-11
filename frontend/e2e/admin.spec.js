// frontend/e2e/admin.spec.js
import { test, expect } from "@playwright/test";

test.describe("E2E Admin & Security", () => {
  test.beforeEach(async ({ page }) => {
    // Mock fetch globally before any page code runs
    await page.addInitScript(() => {
      const originalFetch = window.fetch;
      window.fetch = async (url, options = {}) => {
        const urlStr = url.toString();
        console.log('[MOCK FETCH] Intercepted:', urlStr);
        
        // Mock /api/auth/me
        if (urlStr.includes('/api/auth/me')) {
          console.log('[MOCK FETCH] Returning mock for /api/auth/me');
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
          }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          });
        }
        
        // Mock /api/auth/verify-password
        if (urlStr.includes('/api/auth/verify-password')) {
          return new Response(JSON.stringify({ ok: true }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          });
        }
        
        // Mock /api/celdas/resumen
        if (urlStr.includes('/api/celdas/resumen')) {
          return new Response(JSON.stringify({ totales: { total: 10, libres: 10 } }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          });
        }
        
        // Mock /api/usuarios
        if (urlStr.includes('/api/usuarios')) {
          return new Response(JSON.stringify({ rows: [], total: 0 }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          });
        }
        
        // Mock /api/auth/refresh
        if (urlStr.includes('/api/auth/refresh')) {
          console.log('[MOCK FETCH] Returning mock for /api/auth/refresh');
          return new Response(JSON.stringify({ token: 'new-fake-jwt' }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          });
        }
        
        // Default mock for other /api/ endpoints to prevent 401s
        if (urlStr.includes('/api/')) {
          console.log('[MOCK FETCH] Default mocking for:', urlStr);
          // Return a structured response that components expect
          let data = { success: true };
          if (urlStr.includes('/api/users')) {
            data = { rows: [], total: 0 };
          }
          return new Response(JSON.stringify(data), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          });
        }
        
        return originalFetch(url, options);
      };
    });
  });

  test("debería acceder a gestión de usuarios y mostrar formulario", async ({ page }) => {
    // Capture console logs from the page
    page.on('console', msg => console.log('[PAGE CONSOLE]', msg.text()));
    page.on('pageerror', err => console.log('[PAGE ERROR]', err.message));
    
    console.log('Navigating to /users...');
    await page.goto("/users");
    
    // Debug: check localStorage
    const localStorageData = await page.evaluate(() => {
      const result = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        result[key] = localStorage.getItem(key);
      }
      return result;
    });
    console.log('localStorage:', JSON.stringify(localStorageData, null, 2));
    
    // Wait a bit for any async operations
    await page.waitForTimeout(1000);
    
    console.log('Current URL:', page.url());
    console.log('Page title:', await page.title());
    
    // Verificar que estamos en la lista de usuarios
    console.log('Checking for h2...');
    await expect(page.locator("h2")).toContainText("Usuarios");
    
    // Abrir formulario nuevo usuario - click en el botón
    console.log('Clicking Nuevo usuario button...');
    await page.getByRole('button', { name: /nuevo usuario/i }).click({ force: true });
    
    // El modal pide confirmación de password del admin
    console.log('Waiting for dialog...');
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    
    console.log('Dialog visible, filling password...');
    await page.fill('input[type="password"]', "admin123");
    
    console.log('Clicking Continuar...');
    await page.getByRole('button', { name: /continuar/i }).click({ force: true });
    
    // Verificar que se abrió el formulario de nuevo usuario
    console.log('Checking for Nuevo usuario heading...');
    await expect(page.getByRole('heading', { name: /nuevo usuario/i })).toBeVisible();
  });
});