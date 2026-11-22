# 🅿️ Auto Colombia — Sistema de Parqueadero Vehicular

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-5.3.0-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![MySQL](https://img.shields.io/badge/MySQL-8.0%2B-4479A1?style=for-the-badge&logo=mysql&logoColor=white)](https://www.mysql.com/)
[![React](https://img.shields.io/badge/React-19.3.1-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8.3.4-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Material UI](https://img.shields.io/badge/Material%20UI-9.5.0-007FFF?style=for-the-badge&logo=mui&logoColor=white)](https://mui.com/)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg?style=for-the-badge)](https://opensource.org/licenses/ISC)

Sistema de gestión de ingresos y salidas de vehículos para parqueaderos por mensualidad con celdas numeradas, desarrollado con **backend en Node.js + Express + MySQL** (sin ORM, consultas SQL nativas mediante `mysql2`) y **frontend en React + Vite + Material UI**.

Permite registrar el ingreso y salida de vehículos (carros y motos) buscando por **placa o documento del propietario**, validar placas con formato colombiano, **gestionar mensualidades y confirmar pagos** (con renovación anticipada y control de cupos), **bloquear el ingreso cuando no hay mensualidad vigente**, asignar celdas rotativas por tipo de vehículo, **reubicar vehículos dentro del parqueadero**, gestionar usuarios con roles (administrador / operador) con **re-autenticación del administrador en acciones sensibles** y mantener un historial auditable de accesos.

La API está protegida con **JWT (Bearer)** y control de roles. El operador y el turno se resuelven a partir del usuario autenticado.

> 📅 Última actualización de esta documentación: **21/11/2026**.

---

## 📑 Tabla de contenidos

1. [Descripción del proyecto](#1-descripción-del-proyecto)
2. [Tipo de proyecto y arquitectura](#2-tipo-de-proyecto-y-arquitectura)
3. [Stack tecnológico](#3-stack-tecnológico)
4. [Estructura del proyecto](#4-estructura-del-proyecto)
5. [Requisitos previos](#5-requisitos-previos)
6. [Instalación paso a paso](#6-instalación-paso-a-paso)
7. [Variables de entorno](#7-variables-de-entorno)
8. [Base de datos](#8-base-de-datos)
9. [Ejecución del proyecto](#9-ejecución-del-proyecto)
10. [Autenticación y autorización](#10-autenticación-y-autorización)
11. [API REST y endpoints](#11-api-rest-y-endpoints)
12. [Flujos del sistema](#12-flujos-del-sistema)
13. [Reglas de negocio y restricciones](#13-reglas-de-negocio-y-restricciones)
14. [Esquema de base de datos](#14-esquema-de-base-de-datos)
15. [Frontend: pantallas y rutas](#15-frontend-pantallas-y-rutas)
16. [Scripts disponibles](#16-scripts-disponibles)
17. [Pruebas](#17-pruebas)
18. [Documentación y calidad de código](#18-documentación-y-calidad-de-código)
19. [Estado del proyecto y pendientes](#19-estado-del-proyecto-y-pendientes)
20. [Licencia](#20-licencia)
21. [Notas importantes](#21-notas-importantes)

---

## 1. Descripción del proyecto

**Auto Colombia** es un sistema de control de acceso vehicular para parqueaderos por mensualidad que gestiona:

- ✅ **Ingreso y salida de vehículos** (carros y motos) con selección de celda libre del mismo tipo del vehículo. La búsqueda acepta **placa o documento del propietario**; si el documento tiene varios vehículos, se muestra un diálogo para elegir cuál ingresa o sale.
- ✅ **Validación de placas** según formato colombiano (`AAA###` para carro, `AAA##X` para moto), en backend y frontend.
- ✅ **Módulo de mensualidades** (RF05/RF06): listado con filtros y prioridad de renovación, resumen por tipo con cupos, detalle por placa con historial de pagos y mensualidades, previsualización y **confirmación de pago**, renovación anticipada (≤ 5 días antes del vencimiento), cancelación de mensualidad y eliminación de vehículos sin historial.
- ✅ **Control de ingreso por mensualidad**: solo ingresan vehículos con estado **Al día** o **Pendiente** (último día pagado). Sin mensualidad vigente el ingreso se bloquea con `403`.
- ✅ **Consulta de estado** del vehículo (dentro/fuera, modelo, año, color, propietario, tipo, tarifa y estado de mensualidad).
- ✅ **Consulta de celdas disponibles** filtradas por tipo de vehículo.
- ✅ **Reubicación de vehículos**: el administrador puede mover un vehículo que ya está dentro a otra celda libre compatible (botón _Reubicar_ en la pantalla de Celdas).
- ✅ **Autenticación JWT** con roles `administrador` y `operador`, tokens de acceso y refresh con rotación (guardados con hash SHA-256), **sesión única por usuario** y renovación automática del token en el frontend.
- ✅ **Gestión de usuarios** (alta, edición, activación/desactivación, restablecimiento de clave) solo por administrador, con **re-autenticación con la clave del administrador** antes de crear, editar o restablecer claves.
- ✅ **Indicador de sesión** (Conectado / Desconectado) y último acceso por usuario.
- ✅ **Gestión de celdas** (creación con límites por tipo, intercambio de tipo entre dos celdas libres, activación/inactivación, mantenimiento con duración y liberación automática, eliminación, resumen y vista por bloques). El **operador** tiene una vista de solo lectura.
- ✅ **Gestión de vehículos y propietarios** (registro, edición, activación/desactivación, búsqueda por texto o por documento). Desde el frontend se registran y editan en la pantalla de Mensualidades.
- ✅ **Historial de accesos** filtrable por placa, celda, operador, estado (adentro/fuera) y rango de fechas, con paginación.
- ✅ **Dashboards por rol** (administrador y operador) con resumen de celdas actualizado automáticamente cada 60 s (se pausa si la pestaña no está visible).
- ✅ **Auditoría** de login/logout, de movimientos (entrada, salida, reubicación), de rechazos de movimientos, de acciones sobre usuarios y de mensualidades (pago confirmado, mensualidad cancelada, vehículo eliminado), además del registro de intentos fallidos de login (anti fuerza bruta).
- ✅ **Prevención de sobrecupo**: índices únicos en la base de datos impiden que un vehículo o una celda tengan más de un acceso abierto simultáneamente; el cupo de mensualidades (70 carros / 10 motos) se valida dentro de una transacción con bloqueo.
- ✅ **Seguridad HTTP**: Helmet, CORS por lista de orígenes, cabeceras `no-store` en la API y rate limiting (global, login y operaciones sensibles).

> **Modelo de celdas:** el parqueadero usa **celdas rotativas** (cada ingreso elige una celda libre del mismo tipo). Las _celdas fijas_ por vehículo fueron retiradas: las rutas `PUT/DELETE /api/vehiculos/:placa/celda` ya no existen y el estado de celda `asignada` no se genera.

> **Modelo de cobro:** la aplicación **no cobra**. Solo confirma que el pago de la mensualidad (realizado por fuera) fue recibido. El valor siempre sale de `tipos_vehiculos.tarifa_mensual`.

---

## 2. Tipo de proyecto y arquitectura

### 2.1 Tipo de proyecto

Aplicación web full-stack dividida en dos carpetas independientes en la raíz:

| Componente        | Responsabilidad                                                                                             | Tecnología principal       |
| ----------------- | ----------------------------------------------------------------------------------------------------------- | -------------------------- |
| **Backend**       | API REST, lógica de negocio, acceso a datos MySQL, autenticación JWT                                        | Node.js + Express + mysql2 |
| **Frontend**      | Interfaz de usuario (SPA) con rutas protegidas por rol                                                      | React + Vite + Material UI |
| **Base de datos** | Almacenamiento relacional de vehículos, celdas, accesos, usuarios, mensualidades, pagos, tokens y auditoría | MySQL 8.0+                 |

No se utiliza ORM; el backend ejecuta consultas SQL parametrizadas directamente mediante el pool de conexiones de `mysql2/promise`.

### 2.2 Arquitectura del backend

```text
Cliente (React/Vite)
      │ HTTP/JSON (fetch / axios) + Bearer JWT (+ refresh automático)
      ▼
┌─────────────────────────────────────────┐
│  Express (app.js)                       │
│  ├── helmet, cors (lista de orígenes)   │
│  ├── express.json (límite 100 kb)       │
│  ├── rate limiting (global/login/       │
│  │   operaciones sensibles)             │
│  ├── noCache en /api                    │
│  ├── montaje de rutas bajo /api         │
│  └── 404 JSON y manejador de errores    │
└─────────────────────────────────────────┘
      │
      ▼
┌─────────────────────────────────────────┐
│  Routes (auth, users, vehiculos,        │
│  celdas, movimientos, mensualidades)    │
│  ├── authMiddleware (JWT + revocados)   │
│  └── roleMiddleware (roles)             │
└─────────────────────────────────────────┘
      │
      ▼
┌─────────────────────────────────────────┐
│  Controllers (auth, user, vehiculo,     │
│  celda, movimiento, mensualidad)        │
│  └── responden con responseHelper       │
└─────────────────────────────────────────┘
      │
      ▼
┌─────────────────────────────────────────┐
│  Services / Repositories / Utils        │
│  ├── authService, userServices,         │
│  │   mensualidadService                 │
│  ├── userRepository, auditRepository,   │
│  │   refreshTokenRepository,            │
│  │   revokedTokenRepository             │
│  └── utils: celdas, consultas, errores, │
│      fechas, mensualidad, messages,     │
│      responseHelper, turno              │
└─────────────────────────────────────────┘
      │
      ▼
┌─────────────────────────────────────────┐
│  Config: db.js (pool mysql2),           │
│  envLoader.js + envParser.js            │
│  (carga y valida .env sin dotenv)       │
└─────────────────────────────────────────┘
      │
      ▼
┌─────────────────────────────────────────┐
│  MySQL 8.0 (autos_colombia)             │
└─────────────────────────────────────────┘
```

Los movimientos (entrada, salida, reubicación) y las operaciones de mensualidad (pago, cancelación, eliminación de vehículo) se ejecutan dentro de **transacciones** (con `FOR UPDATE` sobre las filas involucradas) y registran su auditoría. Los **rechazos de movimientos** se auditan fuera de la transacción para que el rollback no los borre.

**Formato de respuestas** (`utils/responseHelper.js`):

- Éxito (2xx): `{ "mensaje": "...", ...campos }`. Si el resultado es un arreglo se devuelve como `{ "mensaje": "...", "data": [ ... ] }`.
- Error: `{ "error": "..." }`.
- Los textos se centralizan en `utils/messages.js`.

Al iniciar, `server.js` verifica MySQL, limpia los tokens revocados vencidos (y repite la limpieza cada hora) y cierra el pool de forma ordenada con `SIGINT`/`SIGTERM`.

### 2.3 Arquitectura del frontend

```text
React (Vite)
├── main.jsx                 # Punto de entrada (StrictMode + BrowserRouter + AuthProvider)
├── App.jsx                  # Ruta pública (/login) y resto protegido
├── routes/AppRoutes.jsx     # Layout privado (Sidebar + Navbar) y rutas por rol
├── features/
│   ├── auth/                # LoginPage y AuthContext (sesión, errores, logout)
│   ├── users/               # Listado y formulario de usuarios (admin)
│   └── celdas/              # CeldasPage (admin) y OperatorCeldasPage (solo lectura)
├── pages/                   # Dashboards, IngresoSalida, HistorialAccesos, VistaVacia
├── Components/
│   ├── layout/              # Sidebar, SidebarData, Navbar
│   ├── ingreso-salida/      # FormularioIngreso/Salida, PanelVehiculo/Movimiento,
│   │                        # ResumenSalida, SelectorVehiculoDialog, AlertaPlaca
│   ├── mensualidades/       # MensualidadesPage, PagoModal, DetalleModal,
│   │                        # RegistroVehiculoModal, ConfirmModal, tablas y tarjetas
│   ├── ui/Toast.jsx         # Toast global reutilizable
│   ├── ResumenCeldas.jsx    # Tarjetas y tabla de resumen de celdas
│   └── ProtectedRoute.jsx   # Exige sesión y, opcionalmente, rol
├── hooks/                   # usePolling (pausa por visibilidad) y useAutoLimpiar
├── services/api.js          # Cliente HTTP (fetch) con JWT y refresh automático
├── api/                     # client.js (axios) y mensualidadesApi.js
├── utils/formato.js         # Formateo de moneda (COP) y fechas
└── validators/              # placa.js y documento.js
```

---

## 3. Stack tecnológico

| Capa                | Tecnología               | Versión | Propósito                                                                                                 |
| ------------------- | ------------------------ | ------- | --------------------------------------------------------------------------------------------------------- |
| Runtime backend     | Node.js                  | 18+     | Entorno de ejecución del backend                                                                          |
| Runtime frontend    | Node.js                  | 20.19+  | Requerido por Vite 8 (`engines` del frontend)                                                             |
| Framework backend   | Express                  | ^5.3.0  | Servidor web y enrutamiento REST (errores async reenviados al manejador final)                            |
| Base de datos       | MySQL                    | 8.0+    | Motor relacional                                                                                          |
| Driver MySQL        | mysql2                   | ^3.11.0 | Pool de conexiones y consultas (promises)                                                                 |
| Autenticación       | jsonwebtoken             | ^9.0.2  | Tokens JWT de acceso (con `jti` para revocación)                                                          |
| Hash de contraseñas | bcryptjs                 | ^2.4.3  | Cifrado de claves de usuarios                                                                             |
| Seguridad HTTP      | helmet                   | ^8.3.0  | Headers de seguridad                                                                                      |
| Rate limiting       | express-rate-limit       | ^8.7.2  | Límite de peticiones por IP                                                                               |
| CORS                | cors                     | ^2.8.6  | Control de origen cruzado                                                                                 |
| Dev backend         | nodemon                  | ^3.1.14 | Recarga automática en desarrollo                                                                          |
| Pruebas backend     | node:test                | nativo  | Pruebas unitarias e integración                                                                           |
| Frontend framework  | React                    | ^19.3.1 | Interfaz de usuario                                                                                       |
| Build tool          | Vite                     | ^8.3.4  | Servidor de dev y build de producción                                                                     |
| Routing             | React Router DOM         | ^7.18.4 | Navegación SPA                                                                                            |
| HTTP client         | `fetch` nativo + axios   | ^1.20.0 | `services/api.js` usa `fetch` (con refresh de token); `api/client.js` usa axios (módulo de mensualidades) |
| UI Components       | Material UI              | ^9.5.0  | Iconos y diálogos (el resto de estilos son CSS propios)                                                   |
| Estilos             | CSS propio + Emotion/MUI | ^11.x   | Estilos de la interfaz                                                                                    |
| Pruebas frontend    | Vitest + Testing Library | ^5.1.0  | Pruebas de componentes (jsdom)                                                                            |
| Pruebas E2E         | Playwright               | ^1.65.0 | Flujos de interfaz con respuestas de API simuladas                                                        |
| Linter              | oxlint                   | ^1.88.0 | Análisis estático de código                                                                               |
| Calidad             | SonarQube / SonarLint    | —       | Análisis estático y cobertura (ver sección 18)                                                            |

---

## 4. Estructura del proyecto

```text
Auto_Colombia/
├── .gitignore
├── .puml/                        # Diagramas de secuencia (I1-SD01…, I2-SD01…SD22)
├── .vscode/settings.json         # Conexión SonarLint
├── CLAUDE.md · SKILL.md          # Reglas de trabajo para agentes de IA (ver sección 21)
├── README.md
├── package.json                  # Scripts de la raíz (test, e2e, sonar, check, dev:*)
├── sonar-project.properties(.example)
├── generar-reporte.ps1 · generar-reporte-duo.ps1   # Reporte de texto del proyecto (PowerShell)
├── aplicar_*.mjs · cambios_backend.mjs · helper_vehiculo.inc   # Scripts auxiliares de desarrollo
├── docs/                         # Bóveda Obsidian y evidencias de pruebas (test-results/)
├── ExcelTest/                    # Plan de pruebas de usuarios y celdas (.xlsx)
├── backend/
│   ├── .env · .env.example · package.json · sonar-scan.mjs · SQL_parches.md
│   ├── docs/test-results/        # Evidencias JSON generadas por las pruebas
│   ├── migrations/               # 001 … 007
│   ├── Script/                   # parqueadero.sql, parqueadero.mwb(.bak), migracion_sesion_activa.sql
│   ├── src/
│   │   ├── app.js · server.js
│   │   ├── config/               # db.js, envLoader.js, envParser.js
│   │   ├── controllers/          # auth, celda, cupos*, mensualidad, movimiento, user, vehiculo
│   │   ├── middleware/           # authMiddleware, noCache, rateLimit, roleMiddleware, validation
│   │   ├── repositories/         # audit, refreshToken, revokedToken, user
│   │   ├── routes/               # index, authRoutes, celdas, cupos*, mensualidades, movimientos, userRoutes, vehiculos
│   │   ├── seed/                 # seed.js, catalogoVehiculos.js
│   │   ├── services/             # authService, mensualidadService, userServices
│   │   ├── utils/                # celdas, consultas, errores, fechas, mensualidad, messages, responseHelper, turno
│   │   └── validators/           # placa.js
│   └── test/
│       ├── *.integration.test.js · jwt.test.js · mensualidad.puras.test.js · mensualidades.test.js · validators.test.js
│       ├── helpers/              # db.js (BD de pruebas), reporter.js (evidencias)
│       ├── middleware/           # authMiddleware(.extended), roleMiddleware
│       └── validators/           # placa(.extended), validation(.extended)
└── frontend/
    ├── .env · .oxlintrc.json · index.html · package.json · vite.config.js
    ├── playwright.config.js · storageState.json
    ├── e2e/                      # admin, auth, celdas, historial, parqueadero (.spec.js) + global-setup.js
    ├── test/                     # Pruebas Vitest de componentes y validadores
    └── src/
        ├── main.jsx · App.jsx · App.css · global.css · setupTests.js
        ├── api/                  # client.js (axios), mensualidadesApi.js
        ├── Components/
        │   ├── ProtectedRoute.jsx · ResumenCeldas.jsx
        │   ├── ingreso-salida/   # AlertaPlaca, FormularioIngreso, FormularioSalida,
        │   │                     # PanelMovimiento, PanelVehiculo, ResumenSalida, SelectorVehiculoDialog
        │   ├── layout/           # Navbar, Sidebar, SidebarData (+ CSS)
        │   ├── mensualidades/    # MensualidadesPage, MensualidadDetallePage, PagoModal, DetalleModal,
        │   │                     # RegistroVehiculoModal, ConfirmModal, EstadoBadge, FiltrosMensualidad,
        │   │                     # ResumenCards, TablaMensualidades, Mensualidades.css
        │   └── ui/               # Toast.jsx
        ├── features/
        │   ├── auth/             # context/ (AuthContext, AuthContextObject, authUtils), pages/LoginPage
        │   ├── celdas/           # pages/CeldasPage.jsx, OperatorCeldasPage.jsx
        │   └── users/            # pages/UserListPage.jsx, UserFormPage.jsx
        ├── hooks/                # useAutoLimpiar.js, usePolling.js
        ├── pages/                # DashboardAdmin, DashboardOperador, HistorialAccesos, IngresoSalida, VistaVacia, CSS
        ├── routes/               # AppRoutes.jsx
        ├── services/             # api.js
        ├── utils/                # formato.js
        └── validators/           # placa.js, documento.js
```

> `*` `controllers/cuposController.js` y `routes/cupos.js` existen pero **no están montados** en `routes/index.js` (ver sección 19).

---

## 5. Requisitos previos

| Herramienta                | Versión recomendada | Propósito                                          |
| -------------------------- | ------------------- | -------------------------------------------------- |
| Node.js                    | 20.19 o superior    | Backend (≥ 18) y frontend (≥ 20.19)                |
| npm                        | 9 o superior        | Gestor de paquetes                                 |
| MySQL Server               | 8.0.16+             | Motor de base de datos (columnas generadas, CHECK) |
| MySQL Workbench (opcional) | —                   | Administración visual de BD                        |
| Git                        | 2.0+                | Control de versiones                               |
| SonarQube local (opcional) | —                   | Análisis de calidad (`http://localhost:9000`)      |

---

## 6. Instalación paso a paso

El proyecto se divide en dos partes independientes: **backend** y **frontend**. Cada una tiene su propio `package.json` y se instala por separado.

### Paso 1: Clonar el repositorio

```bash
git clone https://github.com/cirocarrillo01/Autos-colombia.git
cd Autos-colombia
```

### Paso 2: Instalar dependencias del backend

```bash
cd backend
npm install
```

### Paso 3: Instalar dependencias del frontend

```bash
cd ../frontend
npm install
```

### Paso 4: Configurar variables de entorno

**Backend:**

```bash
cd backend
cp .env.example .env
# Editar .env con las credenciales de MySQL y JWT_SECRET
```

**Frontend:**

```bash
cd ../frontend
echo "VITE_API_URL=http://localhost:3000/api" > .env
```

### Paso 5: Crear la base de datos

```bash
mysql -u root -p < backend/Script/parqueadero.sql
```

### Paso 6: Aplicar migraciones (solo si partes de un esquema anterior)

```bash
mysql -u root -p autos_colombia < backend/migrations/002_add_sesion_activa.sql
mysql -u root -p autos_colombia < backend/migrations/003_add_mantenimiento_hasta.sql
mysql -u root -p autos_colombia < backend/migrations/004_create_audit_log.sql
mysql -u root -p autos_colombia < backend/migrations/005_create_revoked_tokens.sql
mysql -u root -p autos_colombia < backend/migrations/006_create_refresh_tokens.sql
mysql -u root -p autos_colombia < backend/migrations/007_audit_log_accion.sql
```

> El script `parqueadero.sql` actual ya incluye todas estas tablas/columnas. Las migraciones se mantienen para actualizar bases creadas con versiones anteriores. Los refresh tokens guardados en claro antes del cambio a SHA-256 dejan de validar: los usuarios deben iniciar sesión de nuevo (ver `backend/SQL_parches.md`).

### Paso 7: Sembrar datos iniciales

Desde `backend/`:

```bash
npm run seed           # Siembra solo si la base está vacía
npm run seed:reset     # Vacía todas las tablas y vuelve a sembrar
```

---

## 7. Variables de entorno

El backend lee `backend/.env` con un cargador propio (`envLoader.js` + `envParser.js`, sin `dotenv`; soporta comillas y comentarios `# ...` en línea). Las variables del sistema tienen prioridad sobre el archivo. Si falta alguna de **`DB_USER`, `DB_NAME` o `JWT_SECRET`** el servidor no arranca y lista las faltantes. En `NODE_ENV=production`, `JWT_SECRET` debe tener **al menos 32 caracteres** o el arranque falla.

### Backend (`backend/.env`)

| Variable         | Valor por defecto                             | Descripción                                                                                                                            |
| ---------------- | --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `NODE_ENV`       | `development`                                 | Entorno. Con `test` se usa la base `DB_NAME_TEST` en lugar de `DB_NAME`                                                                |
| `PORT`           | `3000`                                        | Puerto del servidor Express                                                                                                            |
| `DB_HOST`        | `localhost`                                   | Host de MySQL                                                                                                                          |
| `DB_PORT`        | `3306`                                        | Puerto de MySQL                                                                                                                        |
| `DB_USER`        | — (obligatoria)                               | Usuario de MySQL                                                                                                                       |
| `DB_PASSWORD`    | vacío                                         | Contraseña de MySQL                                                                                                                    |
| `DB_NAME`        | — (obligatoria)                               | Nombre de la base de datos (`autos_colombia`)                                                                                          |
| `DB_NAME_TEST`   | `autos_colombia_test`                         | Base usada cuando `NODE_ENV=test`                                                                                                      |
| `TRUST_PROXY`    | `0`                                           | Número de proxies delante de la app (`0` ninguno, `1` Nginx/LB, etc.) para que `req.ip` y el rate limiting usen la IP real             |
| `CORS_ORIGIN`    | `http://localhost:5173,http://localhost:5174` | **Lista de orígenes permitidos separados por coma.** Orígenes no listados reciben error 403; peticiones sin `Origin` (curl) se aceptan |
| `JWT_SECRET`     | — (obligatoria)                               | Clave secreta para firmar los JWT. Valor largo y aleatorio (mín. 32 caracteres, obligatorio en producción)                             |
| `JWT_EXPIRES_IN` | `8h`                                          | Tiempo de expiración del token de acceso                                                                                               |

> ⚠️ **Importante:** No subas el archivo `.env` a control de versiones. Está incluido en `.gitignore`. Usa `.env.example` como plantilla y cambia `JWT_SECRET` y las credenciales de base de datos en producción.

### Frontend (`frontend/.env`)

| Variable       | Valor por defecto           | Descripción             |
| -------------- | --------------------------- | ----------------------- |
| `VITE_API_URL` | `http://localhost:3000/api` | URL base de la API REST |

---

## 8. Base de datos

### 8.1 Crear la base de datos

Ejecuta el script SQL en MySQL (por ejemplo, con MySQL Workbench o la CLI de mysql):

```bash
mysql -u root -p < backend/Script/parqueadero.sql
```

El script crea:

- La base de datos `autos_colombia` (codificación `utf8mb4`).
- Todas las tablas: `usuarios`, `tipos_vehiculos`, `celdas`, `puertas`, `vehiculos`, `turnos`, `mensualidades`, `pagos`, `accesos_vehiculos`, `novedades`, `login_attempts`, `audit_log`, `revoked_tokens`, `refresh_tokens`.
- Restricciones de integridad (claves foráneas, CHECK, UNIQUE).
- Índices únicos que previenen sobrecupo (`uq_acceso_vehiculo_dentro`, `uq_acceso_celda_ocupada`), el índice único de mensualidad por vehículo e inicio (`uq_mens_vehiculo_inicio`) e índices de apoyo (`ix_acceso_fecha_ingreso`, `ix_la_fecha`).
- Columnas generadas (`vehiculo_dentro`, `celda_ocupada`).

### 8.2 Sembrar datos iniciales

Desde `backend/`:

```bash
npm run seed           # Siembra solo si la base está vacía
npm run seed:reset     # Vacía todas las tablas y vuelve a sembrar
```

El seed crea:

- 2 tipos de vehículo: carro ($250.000 COP/mes) y moto ($100.000 COP/mes).
- 2 puertas (la primera activa es la que usa el backend).
- 80 celdas: 70 de carro (bloques A–G, 10 por bloque) y 10 de moto (bloque H).
- **12 usuarios** (clave `123456` en todos): `admin` (administrador), `operador` (operador) y 10 adicionales que alternan rol (logins con el patrón `adm3`, `ope4`, …).
- 80 vehículos con propietario integrado: `CAR001`–`CAR070` y `MOT01A`–`MOT10A`. Los propietarios son 50 y se reparten entre los vehículos, por lo que **varios documentos tienen más de un vehículo** (útil para probar el selector de vehículo).
- Un **turno abierto** del usuario `operador` y **mensualidades de demostración, cada una con su pago confirmado**, creadas con las mismas reglas del sistema real (fin = inicio + 1 mes − 1 día, fechas en hora de Bogotá):

| Escenario                   | Vehículos                            | Resultado                                      |
| --------------------------- | ------------------------------------ | ---------------------------------------------- |
| Al día (vence en 8–27 días) | `CAR001`–`CAR020`, `MOT01A`–`MOT05A` | Al día, aún no puede renovar                   |
| Próximo a vencer (1–4 días) | `CAR021`–`CAR023`, `MOT06A`          | Al día, **dentro de la ventana de renovación** |
| Último día pagado           | `CAR024`                             | **Pendiente** (aún puede ingresar)             |
| Vencida hace 10 días        | `CAR025`, `CAR026`, `MOT07A`         | **Sin mensualidad** (ingreso bloqueado)        |
| Vigente + siguiente pagado  | `CAR027`                             | Al día con `siguiente_pagado = true`           |
| Sin registros               | resto de vehículos                   | **Sin mensualidad**                            |

---

## 9. Ejecución del proyecto

### 9.1 Backend (modo desarrollo)

Desde `backend/`:

```bash
npm run dev
# Servidor en http://localhost:3000/api
```

### 9.2 Backend (modo producción)

Desde `backend/`:

```bash
npm start
```

### 9.3 Frontend (modo desarrollo)

Desde `frontend/`:

```bash
npm run dev
# Servidor en http://localhost:5173
```

También desde la raíz: `npm run dev:backend` y `npm run dev:frontend`.

### 9.4 Verificar funcionamiento

```bash
curl http://localhost:3000/api/health
# Respuesta esperada:
# { "mensaje": "API Auto Colombia funcionando", "status": "ok" }
```

---

## 10. Autenticación y autorización

La API utiliza **JWT (Bearer)**. Las rutas protegidas requieren el header:

```http
Authorization: Bearer <token>
```

En cada petición el middleware `autenticar` valida el token (HS256), verifica que su `jti` no esté revocado, carga el usuario desde la base de datos (401 si no existe) y rechaza usuarios inactivos (403).

### 10.1 Roles

| Rol             | Permisos principales                                                                                                                                                                                       |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `administrador` | Todo: gestión de usuarios, celdas, reubicación, mensualidades y auditoría.                                                                                                                                 |
| `operador`      | Ingreso/salida, consultas, mensualidades (gestión completa), vehículos.                                                                                                                                     |

> **Política de Staff:** Tanto `administrador` como `operador` comparten las facultades de gestión operativa. Ambas figuras deben cumplir con la **re-autenticación por contraseña** al ejecutar acciones sensibles (cancelar mensualidad, eliminar vehículos, etc.), garantizando la integridad de los datos en acciones críticas.

### 10.2 Endpoints de autenticación

| Método | Endpoint                    | Descripción                                                            | Autenticación              |
| ------ | --------------------------- | ---------------------------------------------------------------------- | -------------------------- |
| `POST` | `/api/auth/login`           | Iniciar sesión (devuelve `token` y `refresh_token`)                    | No                         |
| `POST` | `/api/auth/refresh`         | Renovar token de acceso (rota el refresh token)                        | No (refresh token en body) |
| `POST` | `/api/auth/register`        | Registrar usuario (requiere `claveAdmin` en el cuerpo)                 | Sí (admin)                 |
| `GET`  | `/api/auth/me`              | Datos del usuario autenticado                                          | Sí                         |
| `POST` | `/api/auth/verify-password` | Re-autenticar al usuario (antes de acciones sensibles)                 | Sí (admin u operador)      |
| `POST` | `/api/auth/logout`          | Cerrar sesión (revoca el token y todos los refresh tokens del usuario) | Sí                         |

> No existe cambio de clave "propia": las claves solo las restablece un administrador desde `PATCH /api/users/:id/password`.

### 10.3 Ejemplo de login

**`POST /api/auth/login`**

Cuerpo:

```json
{
  "usuario_login": "admin",
  "clave": "123456"
}
```

Respuesta exitosa (200):

```json
{
  "token": "<jwt>",
  "refresh_token": "<refresh>",
  "usuario": {
    "id_usuario": 1,
    "usuario_login": "admin",
    "rol": "administrador",
    "nombres": "Administrador",
    "apellidos": "Principal",
    "nombreCompleto": "Administrador Principal",
    "estado": "activo"
  }
}
```

| Código | Motivo                                                 |
| ------ | ------------------------------------------------------ |
| 422    | Usuario o clave vacíos                                 |
| 401    | Usuario o clave incorrectos                            |
| 403    | Usuario inactivo                                       |
| 423    | Bloqueo temporal por 5 intentos fallidos en 15 minutos |

### 10.4 Seguridad adicional

- **Rate limiting** (`middleware/rateLimit.js`, ventana de 15 min por IP):
  - Global: **1000** peticiones (2000 en `development`). No cuentan `/api/health`, las lecturas `GET` de las rutas de polling (`/api/celdas*`, `/api/movimientos/historial`, `/api/users*`) ni las peticiones fallidas.
  - Login: **10** intentos fallidos (los exitosos no cuentan).
  - Operaciones sensibles (`/api/auth/verify-password`, `/api/auth/register`, `/api/users` salvo `GET`): **10** intentos fallidos.
- **Anti fuerza bruta**: bloqueo temporal (423) tras 5 intentos fallidos en 15 minutos (por usuario **o** por IP). Mientras está bloqueado no se registran nuevos intentos. La IP se obtiene de `req.ip` (respeta `TRUST_PROXY`; no se confía en `X-Forwarded-For`).
- **Sin enumeración de usuarios**: si el usuario no existe se compara contra un hash falso para igualar tiempos de respuesta.
- **Sesión única**: al iniciar sesión se revocan los refresh tokens previos del usuario.
- **Tokens revocados**: el logout agrega el `jti` del JWT a `revoked_tokens`; la tabla se depura cada hora.
- **Refresh token rotation**: cada refresh revoca el token anterior y emite uno nuevo (duración 7 días). En base de datos se guarda **solo el hash SHA-256** del refresh token.
- **Refresh automático en el cliente** (`services/api.js`): si una petición recibe 401 y hay refresh token, el frontend renueva el access token y reintenta **una sola vez**; las renovaciones concurrentes se serializan para no invalidar el refresh token.
- **Re-autenticación**: crear usuarios, editar usuarios, restablecer claves y cancelar mensualidades piden la clave del usuario (ver 12.3 y 12.6). Una clave incorrecta en las rutas con `claveAdmin` responde 403 (y no 401, para que el frontend no interprete "sesión vencida").
- **Auditoría**: login/logout, movimientos (entrada, salida, reubicación), rechazos (`entrada_rechazada`, `salida_rechazada`, …), acciones sobre usuarios (`CREATE_USER`, `EDIT_USER`, `ACTIVATE_USER`, `DEACTIVATE_USER`, `RESET_PASSWORD`) y de mensualidades (`pago_confirmado`, `mensualidad_cancelada`, `vehiculo_eliminado`) se registran en `audit_log` a nombre de quien ejecutó la acción.
- **Sesión activa**: `usuarios.sesion_activa` se marca al iniciar sesión y se limpia al cerrar sesión, restablecer la clave o desactivar al usuario.
- **Cabeceras de caché**: toda la API responde con `Cache-Control: no-store`.

---

## 11. API REST y endpoints

La API expone los siguientes endpoints bajo el prefijo `/api`. Salvo `/api/health`, `/api/auth/login` y `/api/auth/refresh`, todas las rutas requieren `Authorization: Bearer <token>`. Las rutas inexistentes bajo `/api` responden `404` con `{ "error": "Ruta no encontrada en el sistema. Verifique los parámetros de búsqueda." }`.

> **Convención de respuestas:** en éxito el cuerpo incluye `mensaje` más los campos del recurso (los arreglos viajan en `data`); en error, `{ "error": "..." }`. Los errores de **validación de entrada** responden **422**; los conflictos de estado, 400/409 según el caso.

### 11.1 Resumen de endpoints

| Método   | Endpoint                                  | Descripción                                                                            | Rol                     |
| -------- | ----------------------------------------- | -------------------------------------------------------------------------------------- | ----------------------- |
| `GET`    | `/api/health`                             | Estado de la API                                                                       | Público                 |
| `POST`   | `/api/auth/login`                         | Iniciar sesión                                                                         | Público                 |
| `POST`   | `/api/auth/refresh`                       | Renovar token                                                                          | Público (refresh token) |
| `POST`   | `/api/auth/register`                      | Registrar usuario                                                                      | Admin                   |
| `GET`    | `/api/auth/me`                            | Usuario autenticado                                                                    | Auth                    |
| `POST`   | `/api/auth/verify-password`               | Verificar la clave del usuario autenticado                                             | Admin/Operador          |
| `POST`   | `/api/auth/logout`                        | Cerrar sesión                                                                          | Auth                    |
| `GET`    | `/api/users`                              | Listar/buscar usuarios (`search`, `rol`, `estado`, `page`, `limit`)                    | Admin                   |
| `GET`    | `/api/users/:id`                          | Obtener usuario                                                                        | Admin                   |
| `PUT`    | `/api/users/:id`                          | Editar usuario y rol (requiere `claveAdmin`)                                           | Admin                   |
| `PATCH`  | `/api/users/:id/estado`                   | Activar/desactivar                                                                     | Admin                   |
| `PATCH`  | `/api/users/:id/password`                 | Restablecer clave (requiere `clave` y `claveAdmin`)                                    | Admin                   |
| `GET`    | `/api/vehiculos`                          | Listar/buscar vehículos (`q`, `tipo`, `activo`, `page`, `limit`)                       | Auth                    |
| `GET`    | `/api/vehiculos/documento/:documento`     | Vehículos activos de un propietario por documento                                      | Auth                    |
| `GET`    | `/api/vehiculos/:placa`                   | Consultar vehículo activo por placa                                                    | Auth                    |
| `GET`    | `/api/vehiculos/:placa/raw`               | Registro completo del vehículo (sin filtrar por activo; usado al editar)               | Auth                    |
| `POST`   | `/api/vehiculos`                          | Registrar vehículo + propietario                                                       | Admin/Operador          |
| `PUT`    | `/api/vehiculos/:placa`                   | Editar vehículo y propietario                                                          | Admin/Operador          |
| `PATCH`  | `/api/vehiculos/:placa/estado`            | Activar/desactivar vehículo (no si está dentro)                                        | Admin/Operador          |
| `GET`    | `/api/mensualidades`                      | Listar vehículos con su estado de mensualidad (`q`, `estado`, `tipo`, `page`, `limit`) | Admin/Operador          |
| `GET`    | `/api/mensualidades/resumen`              | Resumen por tipo (al día, pendiente, sin mensualidad, cupo)                            | Admin/Operador          |
| `GET`    | `/api/mensualidades/proximos-vencer`      | Mensualidades que vencen en ≤ 5 días sin siguiente periodo pagado                      | Admin/Operador          |
| `GET`    | `/api/mensualidades/detalle/:placa`       | Detalle del vehículo con historial de mensualidades y pagos                            | Admin/Operador          |
| `GET`    | `/api/mensualidades/previsualizar?placa=` | Calcula el periodo a confirmar sin guardar nada                                        | Admin/Operador          |
| `POST`   | `/api/mensualidades/pago`                 | Confirmar el pago de una mensualidad                                                   | Admin/Operador          |
| `POST`   | `/api/mensualidades/cancelar`             | Cancelar la mensualidad vigente (y la siguiente si ya estaba pagada)                   | Admin/Operador          |
| `POST`   | `/api/mensualidades/eliminar-vehiculo`    | Eliminar un vehículo sin historial ni mensualidades                                    | Admin/Operador          |
| `GET`    | `/api/celdas`                             | Listar celdas (`tipo`, `bloque`, `estado`, `page`, `limit`)                            | Auth                    |
| `GET`    | `/api/celdas/disponibles`                 | Celdas libres, opcionalmente por `tipo`                                                | Auth                    |
| `GET`    | `/api/celdas/resumen`                     | Resumen por tipo y totales                                                             | Auth                    |
| `GET`    | `/api/celdas/bloques`                     | Celdas agrupadas por bloque                                                            | Auth                    |
| `GET`    | `/api/celdas/tipos`                       | Tipos de vehículo activos                                                              | Auth                    |
| `GET`    | `/api/celdas/:id`                         | Obtener celda con su estado                                                            | Auth                    |
| `POST`   | `/api/celdas`                             | Crear celda                                                                            | Admin                   |
| `POST`   | `/api/celdas/intercambiar-tipo`           | Intercambiar el tipo de vehículo entre dos celdas no ocupadas                          | Admin                   |
| `PUT`    | `/api/celdas/:id`                         | Cambiar el tipo de vehículo de una celda no ocupada                                    | Admin                   |
| `PATCH`  | `/api/celdas/:id/estado`                  | Activar/inactivar o poner/quitar mantenimiento                                         | Admin                   |
| `DELETE` | `/api/celdas/:id`                         | Eliminar celda (solo libre y sin historial)                                            | Admin                   |
| `GET`    | `/api/movimientos/historial`              | Historial de accesos con filtros                                                       | Auth                    |
| `GET`    | `/api/movimientos/dentro`                 | Vehículos dentro por placa o documento (`q`)                                           | Auth                    |
| `POST`   | `/api/movimientos/entrada`                | Registrar ingreso                                                                      | Auth                    |
| `POST`   | `/api/movimientos/salida`                 | Registrar salida                                                                       | Auth                    |
| `PATCH`  | `/api/movimientos/:id_acceso/celda`       | Reubicar un vehículo que está dentro                                                   | Admin                   |

### 11.2 Health check

**`GET /api/health`**

```json
{
  "mensaje": "API Auto Colombia funcionando",
  "status": "ok"
}
```

### 11.3 Consultar vehículo por placa

**`GET /api/vehiculos/:placa`**

- `placa`: formato colombiano; se normaliza (mayúsculas, sin espacios ni guiones). Solo devuelve vehículos **activos**.

Respuesta exitosa (200):

```json
{
  "mensaje": "Vehículo obtenido exitosamente.",
  "id": 1,
  "placa": "CAR001",
  "estado": "Dentro",
  "mensualidad": 250000,
  "tipo": "Carro",
  "tipoCodigo": "carro",
  "modelo": "2022",
  "nombreModelo": "Mazda CX-5",
  "color": "Rojo",
  "usuario": "Carlos Perez",
  "documento": "2000000001",
  "estadoMensualidad": "Al día"
}
```

`estado` es `Dentro` o `Fuera`. `estadoMensualidad` toma los valores `Al día`, `Pendiente` (hoy es el último día pagado) o `Sin mensualidad`.

| Código | Motivo                              |
| ------ | ----------------------------------- |
| 422    | Formato de placa inválido           |
| 404    | Vehículo no encontrado (o inactivo) |
| 500    | Error interno del servidor          |

**`GET /api/vehiculos/documento/:documento`** devuelve `{ mensaje, data: [ ...mismo formato... ] }` con los vehículos activos del propietario (documento alfanumérico de 5 a 20 caracteres; 422 si es inválido, 404 si no hay vehículos).

### 11.4 Registrar y editar vehículos

**`POST /api/vehiculos`** — campos obligatorios: `placa`, `id_tipo_vehiculo`, `color`, `modelo` (año entre 1930 y el año actual), `nombre_modelo`, `propietario_nombre`, `propietario_documento`. Opcionales: `propietario_tipo_documento` (`cc` por defecto; `cc | ce | nit | pasaporte`), `propietario_telefono`, `propietario_email`. La placa debe corresponder al tipo elegido. Responde `201` con `{ id_vehiculo, placa }`; `409` si la placa ya existe; `422` por validación.

**`PUT /api/vehiculos/:placa`** — campos editables: `color`, `modelo`, `nombre_modelo`, `propietario_nombre`, `propietario_tipo_documento`, `propietario_documento`, `propietario_telefono`, `propietario_email`. **No acepta `activo`** (para desactivar se usa `PATCH /estado`, que impide desactivar un vehículo que está dentro).

### 11.5 Consultar celdas disponibles

**`GET /api/celdas/disponibles?tipo=carro|moto`**

Devuelve las celdas activas, fuera de mantenimiento y sin acceso abierto. Antes de responder libera los mantenimientos vencidos.

```json
{
  "mensaje": "Listado de Celdas disponibles obtenido exitosamente.",
  "data": [
    {
      "id_celda": 5,
      "codigo": "A-05",
      "id_tipo_vehiculo": 1,
      "letra": "A",
      "numero": 5
    }
  ]
}
```

### 11.6 Listar, resumir y agrupar celdas

**`GET /api/celdas`** — filtros opcionales: `tipo` (`carro|moto`), `bloque` (letra), `estado` (`libre | ocupada | en mantenimiento | inactiva`; un valor distinto responde 400), `page` (por defecto 1) y `limit` (por defecto 20, máximo 100). Responde `{ mensaje, rows, total, page, limit }`; cada fila incluye `estado` derivado y `placa_ocupante`.

**`GET /api/celdas/resumen`** — responde `{ mensaje, porTipo: [...], totales: {...} }` con `total`, `libres`, `ocupadas` y `no_disponibles` (inactivas + en mantenimiento). El campo `asignadas` se mantiene por compatibilidad y siempre vale 0.

**`GET /api/celdas/bloques`** — responde `{ mensaje, data: [{ bloque: "A", celdas: [...] }, ...] }` para la vista visual por bloques.

### 11.7 Registrar ingreso de vehículo

**`POST /api/movimientos/entrada`**

```json
{
  "placa": "CAR001",
  "id_celda": 5
}
```

Respuesta exitosa (201):

```json
{
  "mensaje": "Entrada registrada correctamente",
  "id": 101,
  "placa": "CAR001",
  "tipo": "Carro",
  "celda": "A-05",
  "accion": "entrada",
  "fecha": "22/10/2026",
  "hora": "02:30 p. m."
}
```

| Código | Motivo                                                                                            |
| ------ | ------------------------------------------------------------------------------------------------- |
| 400    | El vehículo ya está dentro del parqueadero                                                        |
| 403    | El vehículo **no tiene mensualidad vigente** (estado `Sin mensualidad`)                           |
| 404    | Vehículo no encontrado o inactivo                                                                 |
| 409    | La celda no existe/no está habilitada/ya está ocupada, o carrera de concurrencia (índices únicos) |
| 422    | Placa o celda faltantes; placa inválida o incoherente con el tipo; celda de otro tipo de vehículo |
| 500    | Error interno                                                                                     |

### 11.8 Registrar salida de vehículo

**`POST /api/movimientos/salida`**

```json
{
  "placa": "CAR001"
}
```

Respuesta exitosa (200):

```json
{
  "mensaje": "Salida registrada correctamente",
  "id": 101,
  "placa": "CAR001",
  "tipo": "Carro",
  "celda": "A-05",
  "accion": "salida",
  "fecha_ingreso": { "fecha": "22/10/2026", "hora": "02:30 p. m." },
  "permanencia": "1 h 15 min",
  "fecha": "22/10/2026",
  "hora": "03:45 p. m."
}
```

| Código | Motivo                                                  |
| ------ | ------------------------------------------------------- |
| 400    | El vehículo no tiene un acceso abierto (no está dentro) |
| 404    | Vehículo no registrado                                  |
| 422    | Placa requerida o inválida                              |
| 500    | Error interno del servidor                              |

### 11.9 Buscar vehículos dentro (placa o documento)

**`GET /api/movimientos/dentro?q=<placa|documento>`** — devuelve `{ mensaje, data: [{ id_acceso, placa, propietario, documento, tipo, tipoCodigo, celda, entrada, salida, permanencia }] }`, donde `salida` es la fecha/hora actual (vista previa de la salida). 422 si `q` está vacío; 404 si no hay vehículos dentro con esa placa o documento.

### 11.10 Reubicar un vehículo (administrador)

**`PATCH /api/movimientos/:id_acceso/celda`**

```json
{
  "id_celda": 12
}
```

Respuesta exitosa (200):

```json
{
  "mensaje": "Vehículo reubicado correctamente",
  "id": 101,
  "placa": "CAR001",
  "celda_origen": "A-05",
  "celda": "A-12",
  "accion": "reubicacion"
}
```

| Código | Motivo                                                                                      |
| ------ | ------------------------------------------------------------------------------------------- |
| 404    | Acceso no encontrado o el vehículo ya salió                                                 |
| 409    | La celda destino ya está ocupada                                                            |
| 422    | Acceso o celda inválidos; celda inexistente, deshabilitada, en mantenimiento o de otro tipo |
| 500    | Error interno                                                                               |

### 11.11 Historial de accesos

**`GET /api/movimientos/historial`** — filtros opcionales: `placa`, `celda`, `operador` (nombre o apellido del operador de ingreso/salida), `estado` (`adentro | fuera`, evalúa el último acceso de cada vehículo), `fecha_desde`, `fecha_hasta` (formato `AAAA-MM-DD`, fecha de ingreso en hora de Bogotá; 422 si el formato es inválido), `page` y `limit` (máx. 100). Los filtros de texto usan coincidencia parcial (`LIKE`). Responde `{ mensaje, rows, total, page, limit }`.

### 11.12 Gestión de celdas (administrador)

| Operación                            | Cuerpo                                                                     | Reglas                                                                                                                                                                                                                     |
| ------------------------------------ | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST /api/celdas`                   | `{ letra, numero, id_tipo_vehiculo }`                                      | Letra A–Z, número ≥ 1 (422 si no); posición única (409 si existe); máximo **70 celdas de carro** y **10 de moto** (400 si se excede)                                                                                       |
| `POST /api/celdas/intercambiar-tipo` | `{ id_celda_1, id_celda_2 }`                                               | Intercambia los tipos en una transacción con bloqueo de filas. Ambas deben existir (404), no estar ocupadas y ser de tipos distintos (400); ids inválidos o iguales (422)                                                  |
| `PUT /api/celdas/:id`                | `{ id_tipo_vehiculo }`                                                     | Cambia el tipo de una celda **no ocupada** (400 si está ocupada); valida que el tipo exista y el límite del tipo destino                                                                                                   |
| `PATCH /api/celdas/:id/estado`       | `{ activa: bool }` y/o `{ en_mantenimiento: bool, minutos_mantenimiento }` | La duración del mantenimiento por defecto es 60 min y debe ser ≥ 1; **no se puede inactivar ni poner en mantenimiento una celda ocupada**; al reactivar una celda no se puede superar el límite de celdas activas del tipo |
| `DELETE /api/celdas/:id`             | —                                                                          | Solo si no está ocupada y no tiene historial de accesos (409 en caso contrario)                                                                                                                                            |

### 11.13 Gestión de usuarios (administrador)

- **`POST /api/auth/register`** — `claveAdmin` obligatoria en el cuerpo (422 si falta, 403 si es incorrecta). Campos obligatorios: `rol`, `tipo_documento` (`cc | ce | nit | pasaporte`), `documento` (5–20 caracteres), `nombres`, `apellidos`, `usuario_login` (mín. 3), `clave` (mín. 4); opcionales `telefono` y `email` (formato válido y único). Responde 409 si documento, login o correo ya existen, indicando cuál campo duplica.
- **`PUT /api/users/:id`** — requiere `claveAdmin` en el cuerpo (422 si falta, 403 si es incorrecta). No permite que un administrador cambie su propio rol. El estado no se modifica por esta ruta.
- **`PATCH /api/users/:id/estado`** — `{ estado: "activo" | "inactivo" }`. Un administrador no puede desactivarse a sí mismo; al desactivar se cierra la sesión activa.
- **`PATCH /api/users/:id/password`** — `{ clave, claveAdmin }`; la nueva clave debe tener al menos 4 caracteres. Revoca los refresh tokens y cierra la sesión del usuario afectado.
- **`POST /api/auth/verify-password`** — `{ clave }`; devuelve `{ "ok": true }` o 400 si la clave es incorrecta.

### 11.14 Módulo de mensualidades

#### Listar — `GET /api/mensualidades`

Parámetros: `q` (placa o documento), `estado` (`Al día | Pendiente | Sin mensualidad`; otro valor → 422), `tipo` (`carro | moto`; otro valor → 422), `page` y `limit` (por defecto 10). Solo vehículos activos. El orden es por prioridad: primero los que **pueden renovar**, luego los **al día** y al final el resto, y por placa dentro de cada grupo; la paginación se hace después de ordenar.

Cada fila de `rows`:

```json
{
  "id_vehiculo": 21,
  "placa": "CAR021",
  "propietario": "Maria Rodriguez",
  "documento": "2000000021",
  "tipo": "Carro",
  "tipo_codigo": "carro",
  "estado": "Al día",
  "valor": 250000,
  "fecha_vencimiento": "2026-11-23",
  "dias_para_vencer": 2,
  "siguiente_pagado": false,
  "puede_renovar": true,
  "sin_cupo": false,
  "puede_pagar": true,
  "id_mensualidad": 61,
  "dentro": false
}
```

`fecha_vencimiento` es hasta cuándo está **realmente pagado** el vehículo (incluye el siguiente periodo si ya se confirmó).

#### Resumen — `GET /api/mensualidades/resumen`

```json
{
  "mensaje": "Resumen de Mensualidades obtenido exitosamente.",
  "porTipo": [
    {
      "tipo": "carro",
      "al_dia": 24,
      "pendiente": 1,
      "sin_mensualidad": 45,
      "ocupados": 25,
      "capacidad": 70
    },
    {
      "tipo": "moto",
      "al_dia": 6,
      "pendiente": 0,
      "sin_mensualidad": 4,
      "ocupados": 6,
      "capacidad": 10
    }
  ]
}
```

Siempre devuelve ambos tipos. `ocupados` cuenta los vehículos con mensualidad que cubre hoy o futura.

#### Próximos a vencer — `GET /api/mensualidades/proximos-vencer`

`{ mensaje, data: [{ placa, propietario, tipo, fecha_fin, id_mensualidad }] }` con las mensualidades que vencen en los próximos 5 días y **aún no tienen** un siguiente periodo confirmado.

#### Detalle — `GET /api/mensualidades/detalle/:placa`

Devuelve `vehiculo` (datos del vehículo y propietario más `estado`), `mensualidad_actual` (periodo, valor, estado y `confirmador`), `proximo_periodo` (si ya está pagado), `historial_mensualidades` y `historial_pagos` (fecha, monto, periodo y operador que confirmó). 422 si la placa es inválida; 404 si no existe.

#### Previsualizar pago — `GET /api/mensualidades/previsualizar?placa=ABC123`

Solo calcula; **no guarda nada**.

```json
{
  "mensaje": "Previsualización del pago",
  "placa": "CAR021",
  "propietario": "Maria Rodriguez",
  "tipo": "Carro",
  "valor": 250000,
  "periodo": { "inicio": "2026-11-24", "fin": "2026-12-23" },
  "es_renovacion": true,
  "puede_pagar": true,
  "motivo_bloqueo": null,
  "dias_restantes": 2,
  "estado_actual": "Al día",
  "hay_cupo": true,
  "cupo": { "ocupados": 25, "max": 70 }
}
```

Si `puede_pagar` es `false`, `motivo_bloqueo` explica la razón (siguiente periodo ya confirmado, todavía faltan más de 5 días, o no hay cupo).

#### Confirmar pago — `POST /api/mensualidades/pago`

```json
{ "placa": "CAR021" }
```

Respuesta (201): `{ "mensaje": "Pago CAR021 registrado", "pago": { id_mensualidad, id_pago, placa, tipo, propietario, periodo: { inicio, fin }, valor, es_renovacion } }`.

La operación crea la mensualidad y el pago en una transacción (con bloqueo del vehículo y de la mensualidad vigente) usando el **turno abierto** del usuario (lo crea si no existe) y registra `pago_confirmado` en la auditoría.

| Código | Motivo                                                                                                                    |
| ------ | ------------------------------------------------------------------------------------------------------------------------- |
| 400    | Vehículo inactivo o sin turno abierto                                                                                     |
| 404    | Vehículo no encontrado                                                                                                    |
| 409    | Ya tiene confirmado el siguiente periodo; la mensualidad está vigente y faltan más de 5 días; sin cupo; periodo duplicado |
| 422    | Placa faltante o inválida; placa incoherente con el tipo; tarifa inválida                                                 |

#### Cancelar — `POST /api/mensualidades/cancelar`

```json
{ "placa": "CAR021" }
```

Cancela la mensualidad que cubre hoy **y** la siguiente si ya estaba pagada. El vehículo queda `Sin mensualidad` y se libera el cupo. Responde `{ placa, nuevo_estado, canceladas, periodo, valor }`. Errores: 400 si el vehículo está dentro del parqueadero; 409 si no tiene mensualidad activa; 404 si no existe. Audita `mensualidad_cancelada`.

#### Eliminar vehículo — `POST /api/mensualidades/eliminar-vehiculo`

```json
{ "placa": "CAR071" }
```

Solo si el vehículo **no está dentro, no tiene accesos y no tiene mensualidades ni pagos** (400 en caso contrario). Audita `vehiculo_eliminado`.

---

## 12. Flujos del sistema

### 12.1 Ingreso de vehículo

1. El operador (autenticado) ingresa la **placa o el documento del propietario**. Si es un documento con varios vehículos se abre un diálogo para elegir cuál ingresa (los que ya están dentro aparecen deshabilitados). Si es una placa, el frontend valida el formato y consulta el vehículo.
2. Si la placa ya está adentro, se avisa y no se permite el ingreso. Si la mensualidad **no está "Al día" ni "Pendiente"** (es decir, `Sin mensualidad`), el vehículo se muestra pero el botón de ingreso queda bloqueado.
3. El frontend lista solo las celdas **libres del mismo tipo** del vehículo y el operador elige una.
4. El backend revalida: formato de placa, vehículo activo, placa coherente con su tipo, que no esté ya adentro y que tenga **mensualidad vigente** (403 en caso contrario).
5. Verifica que la celda exista, esté activa, no esté en mantenimiento, sea compatible con el tipo y esté libre.
6. Resuelve el operador autenticado, su turno abierto (crea uno si no existe) y la primera puerta activa.
7. Registra el acceso en `accesos_vehiculos` y la auditoría dentro de una transacción.
8. La celda pasa a estado `ocupada` hasta que se registre la salida. Si la celda se ocupó entre tanto (409), el frontend refresca la lista de celdas disponibles.

Los formularios de ingreso y salida se **limpian solos tras 35 segundos** de inactividad.

### 12.2 Salida de vehículo

1. El operador ingresa la placa o el documento; el frontend consulta `GET /api/movimientos/dentro`. Si hay varios vehículos dentro para ese documento, se elige uno en el diálogo.
2. Se muestra un **resumen previo** (propietario, celda, hora de entrada, hora de salida y permanencia) y el operador pulsa **Confirmar salida**.
3. El backend valida el formato, que el vehículo exista y que tenga un acceso abierto.
4. Resuelve operador, turno y puerta.
5. Cierra el acceso (`fecha_salida`, operador, puerta y turno de salida), registra la auditoría y libera la celda inmediatamente.

> La salida **no** se bloquea por mensualidad: un vehículo dentro siempre puede salir.

### 12.3 Creación y gestión de usuarios (administrador)

El rol `administrador` gestiona el personal del parqueadero (operadores y otros administradores). Los clientes del parqueadero no son usuarios; sus datos viven en `vehiculos`.

1. En **Usuarios → Nuevo usuario** el sistema pide primero la **clave del administrador** (`POST /api/auth/verify-password`) y luego abre el formulario, que vuelve a pedir la clave del administrador para confirmar el guardado.
2. Se completan rol, tipo y número de documento, nombres, apellidos, correo, teléfono, usuario de login y clave (con confirmación).
3. `POST /api/auth/register` valida los campos y que documento, login y correo no estén duplicados.
4. La clave se guarda cifrada con bcrypt en `clave_hash`; el usuario queda `activo`.
5. **Editar** y **Clave (restablecer)** también piden confirmar la clave del administrador en el frontend, y el backend la vuelve a validar (`claveAdmin`) como segunda capa.
6. El listado muestra si cada usuario está **Conectado / Desconectado** y su último acceso, y se refresca cada 60 segundos. Un administrador no puede desactivarse a sí mismo.

| Rol             | Qué puede hacer                                                                                                                                                        |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `administrador` | Gestiona usuarios, celdas, reubicaciones, consulta historial y dashboard completo; accede a todas las rutas.                                                           |
| `operador`      | Registra ingresos y salidas, consulta vehículos, celdas (solo lectura), historial y su dashboard; gestiona vehículos y mensualidades (pago, cancelación, eliminación). |

### 12.4 Creación y gestión de celdas (administrador)

1. En **Celdas** el administrador crea una celda indicando bloque (A–Z), número y tipo (`POST /api/celdas`) desde un diálogo.
2. El backend valida la posición única y los límites por tipo (70 carro / 10 moto). El código se genera automáticamente (`LETRA-NÚMERO`, ej. `A-05`).
3. Desde la lista puede **cambiar el tipo** (se **intercambia** con una celda libre del tipo contrario para no romper los límites), **inactivar/activar**, **eliminar** (solo celdas libres sin historial) o poner en **mantenimiento** indicando horas y minutos (con atajos de 15 min a 1 día).
4. Al vencer `mantenimiento_hasta` la celda se libera automáticamente (se procesa en cada consulta de celdas y el estado derivado ya la considera libre).
5. La vista **Por bloques** muestra todas las celdas coloreadas por estado; el botón **Estado actual** abre el resumen por tipo.

| Estado             | Qué significa                                                                              |
| ------------------ | ------------------------------------------------------------------------------------------ |
| `libre`            | Activa, fuera de mantenimiento y sin acceso abierto. Puede usarse para ingresos.           |
| `ocupada`          | Tiene un acceso abierto (`fecha_salida IS NULL`). Bloquea nuevos ingresos hasta la salida. |
| `en mantenimiento` | Fuera de servicio temporal hasta `mantenimiento_hasta`.                                    |
| `inactiva`         | Deshabilitada hasta que se reactive.                                                       |

Prioridad del estado derivado: `inactiva` > `en mantenimiento` > `ocupada` > `libre`.

### 12.5 Reubicación de un vehículo (administrador)

1. En **Celdas → Lista**, las celdas `ocupada` muestran el botón **Reubicar**.
2. El sistema consulta las celdas libres del mismo tipo y localiza el acceso abierto de esa celda en el historial.
3. El administrador elige la celda destino y confirma.
4. `PATCH /api/movimientos/:id_acceso/celda` valida que la celda esté habilitada, libre y sea del tipo del vehículo, actualiza el acceso y registra la acción `reubicacion` en `audit_log`.

### 12.6 Mensualidades y confirmación de pagos

1. En **Mensualidades** se ven las tarjetas resumen por tipo (al día, pendiente, sin mensualidad y cupo `ocupados/capacidad`), el aviso de **próximos a vencer** y la tabla de vehículos con filtros (placa/documento, estado, tipo). La lista se refresca cada 60 s y el buscador aplica _debounce_ de 300 ms.
2. **Registrar vehículo** (botón _Nuevo Registro_): crea vehículo y propietario en un solo formulario (valida placa contra el tipo y año entre 1930 y el actual). El ícono de lápiz permite **editar** (la placa y el tipo no se modifican).
3. **Registrar pago:** el modal previsualiza el periodo y el valor; el operador marca que el pago fue **recibido por fuera de la aplicación** y confirma. El botón se deshabilita si no se puede pagar (siguiente periodo ya pagado, aún faltan más de 5 días o sin cupo) y el tooltip explica el motivo.
4. **Cancelar mensualidad:** pide la **clave del usuario** (`verify-password`) antes de ejecutar y no está disponible si el vehículo está dentro o ya está `Sin mensualidad`.
5. **Eliminar vehículo:** solo aparece para vehículos `Sin mensualidad` fuera del parqueadero; el backend rechaza si hay accesos, mensualidades o pagos.
6. El ícono de ojo abre el **detalle** (datos del vehículo y propietario, mensualidad actual, próximo periodo, historial de pagos y de mensualidades).

---

## 13. Reglas de negocio y restricciones

| Área                        | Regla                                                                                                                                                                                                                                                |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Placas**                  | Carro: `AAA###` · Moto: `AAA##X` (validación en backend y frontend) y debe coincidir con el tipo del vehículo                                                                                                                                        |
| **Documento (búsqueda)**    | En ingreso/salida, un texto numérico de 5 a 20 dígitos se trata como documento del propietario; cualquier otro como placa                                                                                                                            |
| **Celdas**                  | Una celda está ocupada si existe un acceso con `fecha_salida IS NULL`                                                                                                                                                                                |
| **Celdas rotativas**        | No hay celdas fijas por vehículo; cada ingreso elige una celda libre del mismo tipo                                                                                                                                                                  |
| **Límites de celdas**       | Máximo 70 celdas de carro y 10 de moto al crear, al cambiar de tipo y al reactivar celdas                                                                                                                                                            |
| **Sobrecupo de celdas**     | Índices únicos `uq_acceso_vehiculo_dentro` y `uq_acceso_celda_ocupada` impiden duplicados incluso con peticiones simultáneas                                                                                                                         |
| **Periodo de mensualidad**  | `fecha_fin = fecha_inicio + 1 mes − 1 día` (ajusta meses cortos). Todas las fechas se manejan como texto `AAAA-MM-DD` en hora de Bogotá                                                                                                              |
| **Estados de mensualidad**  | **Al día** (hoy dentro del periodo), **Pendiente** (hoy es el último día pagado y no hay siguiente periodo), **Sin mensualidad** (sin registros, vencida o cancelada). El estado _En mora_ **ya no existe**                                          |
| **Mensualidad vigente**     | Se elige la que cubre hoy; si no hay, la más reciente ya pagada que inicia en el futuro; si no, la de mayor `fecha_fin`. Las canceladas se ignoran                                                                                                   |
| **Ingreso**                 | Permitido con mensualidad **Al día** o **Pendiente**; `Sin mensualidad` → 403 ("Vehículo bloqueado por falta de mensualidad")                                                                                                                        |
| **Nueva mensualidad**       | Vehículo sin mensualidad o con la mensualidad vencida: el periodo inicia **hoy** y consume cupo                                                                                                                                                      |
| **Renovación anticipada**   | Con mensualidad vigente solo se puede pagar cuando faltan **5 días o menos** (`DIAS_ANTICIPACION_MAX`); el nuevo periodo inicia el día siguiente al fin del actual y **no** consume cupo adicional. Solo puede haber **un** periodo siguiente pagado |
| **Cupos de mensualidad**    | 70 carros y 10 motos: se cuentan vehículos activos distintos con mensualidad no cancelada cuya `fecha_fin ≥ hoy`. Se valida dentro de la transacción de pago bloqueando la fila del tipo                                                             |
| **Cobro**                   | La app **no cobra**: solo confirma el pago hecho por fuera. El valor sale siempre de `tipos_vehiculos.tarifa_mensual`; no se recibe monto ni método. No existen tarifas por hora/día                                                                 |
| **Cancelar mensualidad**    | No si el vehículo está dentro ni si no tiene mensualidad activa. Cancela la vigente y la siguiente pagada. Una mensualidad cancelada se reactiva si se vuelve a pagar con la misma fecha de inicio                                                   |
| **Eliminar vehículo**       | Solo sin accesos, sin mensualidades/pagos y fuera del parqueadero                                                                                                                                                                                    |
| **Operador/Turno**          | Resueltos a partir del usuario autenticado (JWT). Se crea un turno abierto si no existe (`utils/turno.js`)                                                                                                                                           |
| **Puerta**                  | Se usa la primera puerta activa configurada en la base de datos                                                                                                                                                                                      |
| **Mantenimiento**           | Una celda en mantenimiento no recibe vehículos; tiene fecha de fin y se libera automáticamente. No se puede aplicar a una celda ocupada                                                                                                              |
| **Inactivar vehículo**      | No se permite si el vehículo está dentro del parqueadero                                                                                                                                                                                             |
| **Eliminar celda**          | Solo si no está ocupada y no tiene historial de accesos                                                                                                                                                                                              |
| **Cambio de tipo de celda** | Solo celdas no ocupadas; la UI lo ofrece como intercambio con una celda libre del tipo contrario                                                                                                                                                     |
| **Reubicación**             | Solo administrador; la celda destino debe estar libre, habilitada y ser del mismo tipo                                                                                                                                                               |
| **Usuarios (crear)**        | Solo `administrador` vía `POST /api/auth/register` con `claveAdmin`. Valida unicidad de documento, login y correo; clave de mínimo 4 caracteres cifrada con bcrypt; estado inicial `activo`                                                          |
| **Usuarios (editar/clave)** | Requieren `claveAdmin`. Un administrador no puede cambiar su propio rol ni desactivarse                                                                                                                                                              |
| **Intentos de login**       | 5 fallidos en 15 min (por usuario o IP) bloquean el acceso temporalmente (423)                                                                                                                                                                       |
| **Roles**                   | `administrador` y `operador`; las rutas sensibles requieren rol específico                                                                                                                                                                           |
| **Zona horaria**            | Las fechas se almacenan en UTC y se presentan en `America/Bogota`                                                                                                                                                                                    |

---

## 14. Esquema de base de datos

### 14.1 Mapa de tablas

| Tabla               | Descripción                                                                                                                                                               |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `usuarios`          | Login de administrador y operador (solo staff, no clientes). Incluye `sesion_activa`, `fecha_sesion_activa` y `ultimo_acceso`                                             |
| `tipos_vehiculos`   | Moto y carro, con tarifa mensual fija                                                                                                                                     |
| `celdas`            | Spots físicos (letra-número) tipificados por tipo de vehículo; `activa`, `en_mantenimiento` y `mantenimiento_hasta`                                                       |
| `puertas`           | Entradas/salidas del parqueadero                                                                                                                                          |
| `vehiculos`         | Placa, tipo, color, modelo y **datos del propietario integrados** (nombre, tipo y número de documento, teléfono, correo)                                                  |
| `turnos`            | Turno por operador; uno abierto a la vez                                                                                                                                  |
| `mensualidades`     | Periodo contratado por vehículo (`fecha_inicio`, `fecha_fin`, `valor`, `estado` `activa`/`cancelada`, `id_usuario_registro`); índice único por vehículo + fecha de inicio |
| `pagos`             | Confirmación de pago de una mensualidad (`id_mensualidad`, `fecha_pago`, `monto`, `id_turno`, `id_usuario`)                                                               |
| `accesos_vehiculos` | Ingreso/salida del vehículo (bitácora); guarda operador, puerta y turno de ingreso y de salida                                                                            |
| `novedades`         | Incidentes sobre un vehículo o acceso                                                                                                                                     |
| `login_attempts`    | Anti fuerza bruta para admin/operador                                                                                                                                     |
| `audit_log`         | Auditoría de acciones (`accion` es `VARCHAR(50)`)                                                                                                                         |
| `revoked_tokens`    | Revocación de JWT por `jti`                                                                                                                                               |
| `refresh_tokens`    | Sesiones persistentes (se guarda el hash SHA-256 del refresh token)                                                                                                       |

### 14.2 Columnas calculadas (generated columns)

En `accesos_vehiculos`:

- `vehiculo_dentro` — `id_vehiculo` si `fecha_salida IS NULL`, de lo contrario `NULL`.
- `celda_ocupada` — `id_celda` si `fecha_salida IS NULL`, de lo contrario `NULL`.

Estas columnas tienen índices únicos que garantizan integridad concurrente. En `celdas`, `codigo` se genera a partir de letra y número.

### 14.3 Migraciones

Las migraciones incrementales se encuentran en `backend/migrations/`:

- `001_initial_schema.sql` — esquema inicial.
- `002_add_sesion_activa.sql` — sesión activa en usuarios.
- `003_add_mantenimiento_hasta.sql` — fecha de fin de mantenimiento en celdas.
- `004_create_audit_log.sql` — tabla de auditoría.
- `005_create_revoked_tokens.sql` — tokens revocados.
- `006_create_refresh_tokens.sql` — refresh tokens.
- `007_audit_log_accion.sql` — `audit_log.accion` pasa a `VARCHAR(50) NOT NULL` para codificar rechazos (`entrada_rechazada`, `salida_rechazada`, etc.).

Además existe `backend/Script/migracion_sesion_activa.sql` (archivo suelto, duplicado de la migración 002) para bases creadas con `parqueadero.sql` antes de que esas columnas existieran.

Los parches aplicados a `backend/Script/parqueadero.sql` (índices adicionales, evento de purga comentado, hash de refresh tokens) se documentan en `backend/SQL_parches.md`.

---

## 15. Frontend: pantallas y rutas

| Ruta                             | Pantalla                                                                                                                                                                                                                                        | Acceso         |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| `/login`                         | Inicio de sesión                                                                                                                                                                                                                                | Público        |
| `/dashboard`                     | Panel de administración u operador: resumen de celdas (total, libres, ocupadas, no disponibles) por tipo, actualizado cada 60 s; el panel de administrador incluye accesos rápidos y total de usuarios                                          | Autenticado    |
| `/vehiculo`                      | **Historial de accesos** con filtros (placa, celda, operador, estado, fechas), filtrado automático con _debounce_ de 300 ms y paginación                                                                                                        | Autenticado    |
| `/ingreso/salida`                | Tarjetas **Ingresar** y **Salir** lado a lado (búsqueda por placa o documento, diálogo para elegir vehículo, resumen previo de salida y alertas: campo vacío, formato inválido, no registrada, ya procesada, ingreso bloqueado por mensualidad) | Autenticado    |
| `/mensualidades`                 | **Gestión de pagos**: tarjetas resumen y cupos, próximos a vencer, filtros, tabla con acciones (detalle, editar, registrar pago, cancelar mensualidad, eliminar vehículo) y alta de vehículos                                                   | Admin/Operador |
| `/mensualidades/:placa`          | Página de detalle por placa (historial de pagos y de mensualidades)                                                                                                                                                                             | Admin/Operador |
| `/users`                         | Listado de usuarios: búsqueda, filtros, estado de conexión, editar, clave, activar/desactivar                                                                                                                                                   | Administrador  |
| `/users/new` · `/users/:id/edit` | Formulario de usuario (creación y edición piden la clave del administrador)                                                                                                                                                                     | Administrador  |
| `/celdas`                        | **Administrador:** crear, filtrar, vista Lista / Por bloques, mantenimiento, activar/inactivar, intercambiar tipo, eliminar y reubicar. **Operador:** vista de solo lectura (lista, bloques y estado actual)                                    | Autenticado    |

El menú lateral muestra Dashboard, Vehículo, Ingreso/Salida, **Mensualidades** y **Celdas** a todos los usuarios, y **Usuarios** solo a administradores. Las rutas desconocidas redirigen a `/dashboard`. En pantallas ≤ 768 px el menú se pliega a solo iconos. La barra superior muestra el nombre del usuario y un indicador de turno (por ahora estático: _Turno abierto_).

Las pantallas con datos en vivo usan el hook `usePolling` (60 s por defecto): se pausa cuando la pestaña no está visible, refresca al volver y refresca de inmediato cuando cambian filtros o página.

---

## 16. Scripts disponibles

### Raíz (`package.json`)

| Script                         | Comando                                                      | Descripción                              |
| ------------------------------ | ------------------------------------------------------------ | ---------------------------------------- |
| `test`                         | `npm --prefix backend run test`                              | Pruebas del backend                      |
| `test:coverage`                | `npm --prefix backend run test:coverage`                     | Pruebas del backend con cobertura (lcov) |
| `test:e2e`                     | `npm --prefix frontend run test:e2e`                         | Pruebas E2E con Playwright               |
| `sonar`                        | `npx @sonar/scan`                                            | Análisis SonarQube                       |
| `check`                        | `npm run test:coverage && npm run test:e2e && npm run sonar` | Verificación completa                    |
| `dev:backend` · `dev:frontend` | `npm --prefix <carpeta> run dev`                             | Servidores de desarrollo                 |

### Backend (`backend/package.json`)

| Script          | Comando                                                                   | Descripción                                                                      |
| --------------- | ------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `dev`           | `nodemon src/server.js`                                                   | Servidor de desarrollo con recarga automática                                    |
| `start`         | `node src/server.js`                                                      | Servidor en modo producción                                                      |
| `seed`          | `node src/seed/seed.js`                                                   | Siembra datos iniciales si la base está vacía                                    |
| `seed:reset`    | `node src/seed/seed.js --reset`                                           | Vacía todas las tablas y vuelve a sembrar                                        |
| `test`          | `$env:NODE_ENV='test'; $env:DB_NAME='autos_colombia_test'; node --test …` | Ejecuta las pruebas contra la **base de pruebas** (sintaxis PowerShell, Windows) |
| `test:coverage` | `node --test --experimental-test-coverage … lcov`                         | Pruebas con cobertura (`coverage/lcov.info`)                                     |
| `sonar`         | `sonar-scanner-npm`                                                       | Análisis SonarQube del backend                                                   |

### Frontend (`frontend/package.json`)

| Script                            | Comando                 | Descripción                                       |
| --------------------------------- | ----------------------- | ------------------------------------------------- |
| `dev`                             | `vite`                  | Servidor de desarrollo con HMR                    |
| `build`                           | `vite build`            | Build de producción                               |
| `lint`                            | `oxlint`                | Análisis estático de código                       |
| `preview`                         | `vite preview`          | Vista previa del build de producción              |
| `test`                            | `vitest run`            | Pruebas de componentes (una pasada)               |
| `test:watch`                      | `vitest`                | Pruebas en modo observación                       |
| `test:coverage`                   | `vitest run --coverage` | Pruebas con cobertura                             |
| `test:e2e`                        | `playwright test`       | Pruebas E2E (levanta `npm run dev` si hace falta) |
| `test:e2e:ui` · `test:e2e:report` | —                       | Playwright con interfaz / reporte HTML            |

### Utilidades en la raíz

| Archivo                                                         | Descripción                                                                                                                   |
| --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `generar-reporte.ps1` · `generar-reporte-duo.ps1`               | Scripts de PowerShell que generan un reporte de texto con el árbol de directorios y el contenido de los archivos del proyecto |
| `aplicar_*.mjs` · `cambios_backend.mjs` · `helper_vehiculo.inc` | Scripts auxiliares usados durante el desarrollo (aplicación de cambios puntuales al backend)                                  |

---

## 17. Pruebas

### 17.1 Backend

Se ejecutan desde `backend/` con `npm test` usando el runner nativo `node:test`. **Usan una base de datos propia de pruebas**, no la de desarrollo:

1. Crea la base `autos_colombia_test` con el mismo esquema (`backend/Script/parqueadero.sql` adaptando el nombre de la base).
2. `npm test` fija `NODE_ENV=test` y `DB_NAME=autos_colombia_test` (el script usa sintaxis PowerShell; en Linux/macOS ejecuta `NODE_ENV=test DB_NAME=autos_colombia_test node --test --test-force-exit test/**/*.test.js`).
3. `test/helpers/db.js` (`setupTestDB`) **vacía las tablas y vuelve a sembrar datos fijos** al inicio de cada suite de integración. Usa `DB_HOST`, `DB_USER` y `DB_PASSWORD` del entorno.

Datos fijos de la base de pruebas: usuarios `admin`, `administrador`, `operador` y `operador_prueba` (clave `123456`), vehículos `CAR001`–`CAR003`, `CAR006`, `CAR007` y `MOT001`, celdas `B-01`…`B-10` (carro) y `C-01` (moto). `CAR001`–`CAR003` y `MOT001` tienen mensualidad al día, `CAR006` tiene la mensualidad **vencida** (queda `Sin mensualidad`) y `CAR007` **no tiene mensualidad**.

Los casos con identificador del plan de pruebas (`CE-xx`, `US-xx`, `PE-xx`) guardan su evidencia JSON (con tokens y claves ocultos) en `docs/test-results/` mediante `test/helpers/reporter.js`.

| Archivo                                           | Qué cubre                                                                                                                                                                                                |
| ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `validators.test.js`, `validators/placa*.test.js` | Normalización y validación de placas (carro, moto, por tipo, casos borde)                                                                                                                                |
| `validators/validation*.test.js`                  | Validación de datos de usuario (rol, tipo y longitud de documento, login, clave, correo, `requiereClave`)                                                                                                |
| `jwt.test.js`                                     | Generación y verificación de tokens JWT                                                                                                                                                                  |
| `middleware/*.test.js`                            | `autenticar` (sin token, mal formado, expirado) y `autorizarRoles` (sin usuario, rol no autorizado, sensibilidad a mayúsculas)                                                                           |
| `mensualidad.puras.test.js`                       | Reglas puras de mensualidad (sin BD): cálculo de fin de periodo, planificación de renovación (ventana de 5 días), estados Al día / Pendiente / Sin mensualidad, `estadoEfectivo`, `puedeIngresar`, cupos |
| `mensualidades.test.js`                           | Estado de mensualidad por vehículo vía controlador: al día (`CAR001`), vencida (`CAR006`), sin mensualidad (`CAR007`)                                                                                    |
| `auth.integration.test.js`                        | Login exitoso/fallido, token inválido, revocación del token en logout, permisos por rol (PE-xx)                                                                                                          |
| `usuarios.integration.test.js`                    | Registro con `claveAdmin`, duplicados (409), campos obligatorios (422), rol inválido, desactivación con cierre de sesión, restablecimiento de clave y no exposición del hash                             |
| `celdas.integration.test.js`                      | Crear (201), duplicada (409), campos obligatorios (422), límites por tipo (400), filtros y paginación, estado inválido, eliminación con historial (409), concurrencia                                    |
| `movimientos.integration.test.js`                 | Entrada y salida, ingreso duplicado, celda ocupada (409), búsqueda por documento y auditoría de rechazos                                                                                                 |

> ⚠️ Algunos casos de `movimientos.integration.test.js` y `helpers/db.js` quedaron desfasados respecto a las reglas actuales (por ejemplo, el caso de "mensualidad que aún no inicia" espera 403, pero hoy una mensualidad ya pagada con inicio futuro se considera `Al día`; y un `INSERT` de respaldo usa columnas que ya no existen). Revísalos antes de confiar en el resultado completo (ver sección 19).

### 17.2 Frontend

- **Vitest** (`npm test` en `frontend/`): pruebas de componentes con Testing Library y la API simulada — dashboards, `CeldasPage`, formularios de ingreso y salida, historial, login, rutas protegidas, listado y formulario de usuarios, `ResumenCeldas` y validador de placas. **El módulo de mensualidades aún no tiene pruebas de componentes.**
- **Playwright** (`npm run test:e2e`): flujos de login, usuarios, celdas, historial e ingreso/salida. Las llamadas a `/api` se **simulan en el navegador** (no requieren backend ni base de datos); la sesión inicial sale de `storageState.json`.

---

## 18. Documentación y calidad de código

- **Diagramas de secuencia** (`.puml/`): iteración 1 (registrar entrada, registrar salida, consultar historial) e iteración 2 (22 diagramas: gestión de usuarios, autenticación, control de acceso por rol, resumen y gestión de celdas, asignación y reubicación, mantenimiento).
- **Plan de pruebas**: `ExcelTest/Plan_Pruebas_Usuarios_Celdas_Autos_Colombia.xlsx`; sus evidencias se guardan en `docs/test-results/` y `backend/docs/test-results/`.
- **SonarQube / SonarLint**: configuración en `sonar-project.properties` (plantilla `sonar-project.properties.example`) y `.vscode/settings.json` (modo conectado a `http://localhost:9000`). `npm run check` encadena cobertura, E2E y análisis.
- **Linter**: `oxlint` en el frontend (`npm run lint`).

---

## 19. Estado del proyecto y pendientes

**Implementado:** autenticación y roles, usuarios, celdas (incluido intercambio de tipo y vista de solo lectura para operador), ingreso/salida con control de mensualidad y búsqueda por documento, reubicación, historial, dashboards, **módulo de mensualidades (listado, resumen, próximos a vencer, detalle, previsualización, confirmación de pago, renovación anticipada, cancelación, eliminación de vehículos y registro/edición de vehículos desde el frontend)**, auditoría (movimientos, rechazos, usuarios y mensualidades), pruebas de backend, frontend y E2E.

**Pendiente / parcial:**

- **Turnos y novedades:** las tablas existen, pero no tienen endpoints propios (no hay apertura/cierre de turno ni registro de novedades); el indicador de turno de la barra superior es estático. Los turnos solo se crean automáticamente al registrar movimientos o pagos.
- **Pruebas del módulo de mensualidades:** faltan pruebas de integración del backend (pago, renovación, cupos, cancelación) y pruebas de componentes/E2E del frontend.
- **Pruebas desfasadas:** revisar `movimientos.integration.test.js` y `test/helpers/db.js` frente a las reglas actuales de mensualidad (ver 17.1).

**Deuda técnica detectada:**

- `FormularioIngreso.jsx` usa la constante `MSG_SIN_CELDAS`, que **no está definida ni importada**: si no hay celdas disponibles se produce un `ReferenceError`. Debe declararse (por ejemplo, `"No hay celdas disponibles para este tipo de vehículo."`).
- `controllers/cuposController.js` y `routes/cupos.js` no están montados en `routes/index.js` (no hay endpoint `/api/cupos`); el cupo real se calcula en el módulo de mensualidades. Se puede eliminar o montar.
- `server.js` registra un `app.use` de depuración (log de método y URL) **después** de `app.listen`; no tiene efecto útil y debería eliminarse.
- Conviven dos clientes HTTP: `services/api.js` (fetch, con refresh automático de token) y `api/client.js` (axios, usado solo por `mensualidadesApi.js`; ante un 401 limpia el token y redirige a `/login` sin intentar el refresh). Conviene unificarlos.
- `MensualidadDetallePage.jsx` aún muestra los campos `monto_recibido` y `metodo_pago`, que el backend ya no devuelve (la confirmación de pago no los maneja); `DetalleModal.jsx` sí está alineado con la API actual.
- `test/helpers/db.js` contiene una contraseña de MySQL por defecto escrita en el código: debe moverse a variables de entorno y rotarse si fue una credencial real.

---

## 20. Licencia

Este proyecto declara la **Licencia ISC** en el campo `license` de `backend/package.json`. El repositorio todavía no incluye un archivo `LICENSE`.

> ⚠️ **Aviso:** Las credenciales de ejemplo del seed (clave `123456` para `admin`, `operador` y los usuarios adicionales) son solo para entornos de desarrollo. Cámbialas antes de llevar el proyecto a producción.

---

## 21. Notas importantes

- **Sin ORM:** El backend utiliza `mysql2/promise` con consultas SQL parametrizadas nativas.
- **JWT:** Configura un `JWT_SECRET` largo y aleatorio. En producción el arranque falla si tiene menos de 32 caracteres.
- **Rate limiting:** ver sección 10.4 (global, login y operaciones sensibles).
- **Variables de entorno:** Nunca subas `.env` al repositorio. Usa `.env.example` como referencia.
- **CORS:** solo se aceptan los orígenes listados en `CORS_ORIGIN` (por defecto `localhost:5173` y `5174`). Al desplegar, agrega el dominio del frontend.
- **Zona horaria:** Las fechas se guardan en UTC (el pool usa `timezone: "Z"`) y se presentan en `America/Bogota`. Las mensualidades usan fechas de solo día en hora de Bogotá.
- **Base de datos primero:** Debes crear la base con `Script/parqueadero.sql` antes de ejecutar `npm run seed` o iniciar el servidor.
- **Tokens en el navegador:** el frontend guarda el token de acceso, el refresh token y los datos básicos del usuario en `localStorage`.
- **Dependencias sin uso:** `jest` está declarado en `backend/package.json` (las pruebas usan `node:test`). `axios` **sí se usa** ahora (módulo de mensualidades).
- **Pruebas:** usan la base `autos_colombia_test`, que se **vacía y resiembra** en cada suite. Nunca la apuntes a la base de desarrollo o producción. Define las credenciales por variables de entorno.
- **Archivos de reglas para IA (`CLAUDE.md`, `SKILL.md`):** `CLAUDE.md` fue escrito para otro proyecto ("CanchaControl") y menciona rutas que no existen aquí (`frontend/src/api/axios.js`, `frontend/src/context/AuthContext.jsx`, `backend/tests`). En este proyecto la capa HTTP principal es `frontend/src/services/api.js`, el contexto de sesión está en `frontend/src/features/auth/context/` y las pruebas en `backend/test`.

---

<div align="center">

**Auto Colombia — Sistema de Parqueadero Vehicular**  
Desarrollado con ❤️ en Node.js, Express, MySQL, React y Vite

[🔝 Volver al inicio](#️-auto-colombia--sistema-de-parqueadero-vehicular)

</div>
