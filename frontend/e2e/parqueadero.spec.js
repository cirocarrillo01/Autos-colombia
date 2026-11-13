// frontend/e2e/parqueadero.spec.js
import { test, expect } from "@playwright/test";

test.describe("E2E Parking Flow with Mocking", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      const originalFetch = window.fetch;
      window.fetch = async (url, options = {}) => {
        const urlStr = url.toString();
        
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
        
        if (urlStr.includes('/api/vehiculos/buscar/')) {
          // backend: estadoMensualidad corregido a "Al día", tipoCodigo a "carro"
          return new Response(JSON.stringify({ 
            placa: "ABC123", 
            estado: "Fuera", 
            tipo: "carro", 
            estadoMensualidad: "Al día",
            tipoCodigo: "carro" 
          }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }
        
        if (urlStr.includes('/api/vehiculos/') && !urlStr.includes('/api/vehiculos/buscar/')) {
          // backend: estadoMensualidad corregido a "Al día", tipoCodigo a "carro"
          return new Response(JSON.stringify({ 
            placa: "ABC123", 
            estado: "Fuera", 
            tipo: "carro", 
            estadoMensualidad: "Al día",
            tipoCodigo: "carro" 
          }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }
        
        if (urlStr.includes('/api/celdas/disponibles')) {
          return new Response(JSON.stringify([{ id_celda: 1, codigo: "A1", tipo: "carro" }]), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }
        
        if (urlStr.includes('/api/movimientos')) {
          return new Response(JSON.stringify({ id: 10, placa: "ABC123", tipo: "entrada" }), { status: 200, headers: { 'Content-Type': 'application/json' } });
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

  test("debería registrar ingreso exitosamente usando mocks", async ({ page }) => {
    await page.goto("/ingreso/salida");

    await page.fill('input[placeholder*="Placa o documento"]', "ABC123");
    await page.getByRole('button', { name: /buscar/i }).first().click();
    
    // Seleccionar celda mockeada
    await page.getByRole('button', { name: /A1/i }).click();
    await page.getByRole('button', { name: /ingresar/i }).click();
    
    await expect(page.locator('text=Nuevo ingreso')).toBeVisible();
  });
});