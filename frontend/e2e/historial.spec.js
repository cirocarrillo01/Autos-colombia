// frontend/e2e/historial.spec.js
import { test, expect } from "@playwright/test";

test.describe("E2E Historial de Accesos", () => {
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
        
        if (urlStr.includes('/api/movimientos/historial') || urlStr.includes('/api/accesos')) {
          return new Response(JSON.stringify({
            rows: [
              {
                id_acceso: 101,
                placa: "KTM456",
                propietario: "Maria Lopez",
                propietario_nombre: "Maria Lopez",
                celda: "B3",
                celda_codigo: "B3",
                operador_ingreso: "Carlos Gomez",
                operador_ingreso_nombres: "Carlos",
                operador_ingreso_apellidos: "Gomez",
                fecha_ingreso: "2026-11-10T08:30:00Z",
                fecha_salida: null
              }
            ],
            total: 1
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

  test("debería listar los registros del historial de accesos", async ({ page }) => {
    await page.goto("/vehiculo"); // Ruta corregida según RF2

    await expect(page.locator("h2")).toContainText("Historial");
    await expect(page.locator("text=KTM456")).toBeVisible();
    await expect(page.locator("text=Maria Lopez")).toBeVisible();
  });
});
