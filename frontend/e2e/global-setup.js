import { chromium } from '@playwright/test';

async function globalSetup() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  // Mockear la API de login
  await page.route('**/api/auth/login', async (route) => {
    await route.fulfill({
      status: 200,
      body: JSON.stringify({ 
        token: 'fake-jwt', 
        refresh_token: 'fake-refresh',
        usuario: { 
          id_usuario: 1,
          usuario_login: 'admin', 
          rol: 'administrador',
          nombres: 'Admin',
          apellidos: 'Sistema',
          nombreCompleto: 'Admin Sistema',
          email: 'admin@autocolombia.com',
          telefono: '1234567890',
          estado: 'activo'
        } 
      }),
    });
  });

  // Mockear /api/auth/me
  await page.route('**/api/auth/me', async (route) => {
    await route.fulfill({
      status: 200,
      body: JSON.stringify({ 
        id_usuario: 1,
        usuario_login: 'admin', 
        rol: 'administrador',
        nombres: 'Admin',
        apellidos: 'Sistema',
        nombreCompleto: 'Admin Sistema',
        email: 'admin@autocolombia.com',
        telefono: '1234567890',
        estado: 'activo'
      }),
    });
  });

  // Login para generar el estado
  await page.goto('http://localhost:5173/login');
  await page.fill('#usuario_login', 'admin');
  await page.fill('#clave', 'admin123');
  await page.click('button[type="submit"]');
  
  // Esperar a que la autenticación ocurra
  await page.waitForURL('**/dashboard');
  
  // Guardar el estado
  await page.context().addInitScript(() => {
    localStorage.setItem('ac_token', 'fake-jwt');
    localStorage.setItem('ac_user', JSON.stringify({ 
      id_usuario: 1,
      usuario_login: 'admin', 
      rol: 'administrador',
      nombres: 'Admin',
      apellidos: 'Sistema',
      nombreCompleto: 'Admin Sistema',
      email: 'admin@autocolombia.com',
      telefono: '1234567890',
      estado: 'activo'
    }));
  });
  await page.context().storageState({ path: 'storageState.json' });
  await browser.close();
}

export default globalSetup;