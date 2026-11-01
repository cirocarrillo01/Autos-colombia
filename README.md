# 🅿️ Auto Colombia — Sistema de Parqueadero Vehicular

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-5.3.0-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![MySQL](https://img.shields.io/badge/MySQL-8.0%2B-4479A1?style=for-the-badge&logo=mysql&logoColor=white)](https://www.mysql.com/)
[![React](https://img.shields.io/badge/React-19.3.1-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8.3.4-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Material UI](https://img.shields.io/badge/Material%20UI-9.5.0-007FFF?style=for-the-badge&logo=mui&logoColor=white)](https://mui.com/)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg?style=for-the-badge)](https://opensource.org/licenses/ISC)

Sistema de gestión de ingresos y salidas de vehículos para parqueaderos por mensualidad con celdas numeradas, desarrollado con **backend en Node.js + Express + MySQL** (sin ORM, consultas SQL nativas mediante `mysql2`) y **frontend en React + Vite + Material UI**.

Permite registrar el ingreso y salida de vehículos (carros y motos), validar placas con formato colombiano, controlar mensualidades (al día / en mora / sin mensualidad) **bloqueando el ingreso cuando no hay mensualidad vigente**, asignar celdas rotativas por tipo de vehículo, **reubicar vehículos dentro del parqueadero**, gestionar usuarios con roles (administrador / operador) con **re-autenticación del administrador en acciones sensibles**, y mantener un historial auditable de accesos.

La API está protegida con **JWT (Bearer)** y control de roles. El operador y el turno se resuelven a partir del usuario autenticado.

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
18. [Estado del proyecto y pendientes](#18-estado-del-proyecto-y-pendientes)
19. [Licencia](#19-licencia)
20. [Notas importantes](#20-notas-importantes)

---

## 1. Descripción del proyecto

**Auto Colombia** es un sistema de control de acceso vehicular para parqueaderos por mensualidad que gestiona:

- ✅ **Ingreso y salida de vehículos** (carros y motos) con selección de celda libre del mismo tipo del vehículo.
- ✅ **Validación de placas** según formato colombiano (`AAA###` para carro, `AAA##X` para moto), en backend y frontend.
- ✅ **Control de mensualidades**: al día, en mora o sin mensualidad. **El ingreso se bloquea (403)** si el vehículo está en mora o no tiene mensualidad activa.
- ✅ **Consulta de estado** del vehículo (adentro/fuera, modelo, año, color, propietario, tipo, tarifa y estado de mensualidad).
- ✅ **Consulta de celdas disponibles** filtradas por tipo de vehículo.
- ✅ **Reubicación de vehículos**: el administrador puede mover un vehículo que ya está dentro a otra celda libre compatible (botón _reubicar_ en la pantalla de Celdas).
- ✅ **Autenticación JWT** con roles `administrador` y `operador`, tokens de acceso y refresh con rotación, y **renovación automática del token en el frontend**.
- ✅ **Gestión de usuarios** (alta, edición, activación/desactivación, restablecimiento de clave) solo por administrador, con **re-autenticación con la clave del administrador** antes de crear, editar o restablecer claves.
- ✅ **Indicador de sesión** (Conectado / Desconectado) y último acceso por usuario.
- ✅ **Gestión de celdas** (creación con límites por tipo, cambio de tipo, activación/inactivación, mantenimiento con duración y liberación automática, eliminación, resumen y vista por bloques).
- ✅ **Gestión de vehículos y propietarios** vía API (registro, edición, activación/desactivación, búsqueda).
- ✅ **Historial de accesos** filtrable por placa, celda, operador, estado (adentro/fuera) y rango de fechas, con paginación.
- ✅ **Dashboards por rol** (administrador y operador) con resumen de celdas actualizado automáticamente cada 5 segundos.
- ✅ **Auditoría** de login/logout y de movimientos (entrada, salida, reubicación), y registro de intentos fallidos (anti fuerza bruta).
- ✅ **Prevención de sobrecupo**: índices únicos en la base de datos impiden que un vehículo o una celda tengan más de un acceso abierto simultáneamente.
- ✅ **Seguridad HTTP**: Helmet, rate limiting global y específico para login.

> **Cambio de modelo:** el parqueadero usa **celdas rotativas**. Las _celdas fijas_ por vehículo fueron retiradas: los endpoints `PUT/DELETE /api/vehiculos/:placa/celda` responden `410 Gone` y el estado de celda `asignada` ya no se genera.

---

## 2. Tipo de proyecto y arquitectura

### 2.1 Tipo de proyecto

Aplicación web full-stack dividida en dos carpetas independientes en la raíz:

| Componente        | Responsabilidad                                                                                      | Tecnología principal       |
| ----------------- | ---------------------------------------------------------------------------------------------------- | -------------------------- |
| **Backend**       | API REST, lógica de negocio, acceso a datos MySQL, autenticación JWT                                 | Node.js + Express + mysql2 |
| **Frontend**      | Interfaz de usuario (SPA) con rutas protegidas por rol                                               | React + Vite + Material UI |
| **Base de datos** | Almacenamiento relacional de vehículos, celdas, accesos, usuarios, mensualidades, tokens y auditoría | MySQL 8.0+                 |

No se utiliza ORM; el backend ejecuta consultas SQL parametrizadas directamente mediante el pool de conexiones de `mysql2/promise`.

### 2.2 Arquitectura del backend

```text
Cliente (React/Vite)
      │ HTTP/JSON (fetch) + Bearer JWT (+ refresh automático)
      ▼
┌─────────────────────────────────────┐
│  Express (app.js)                   │
│  ├── helmet, cors, express.json     │
│  ├── rate limiting (global + login) │
│  ├── montaje de rutas bajo /api     │
│  └── 404 JSON y manejador de errores│
└─────────────────────────────────────┘
      │
      ▼
┌─────────────────────────────────────┐
│  Routes (auth, users, vehiculos,    │
│  celdas, movimientos)               │
│  ├── authMiddleware (JWT + revocados)│
│  └── roleMiddleware (roles)         │
└─────────────────────────────────────┘
      │
      ▼
┌─────────────────────────────────────┐
│  Controllers                        │
│  ├── authController.js              │
│  ├── userController.js              │
│  ├── vehiculoController.js          │
│  ├── celdaController.js             │
│  └── movimientoController.js        │
└─────────────────────────────────────┘
      │
      ▼
┌─────────────────────────────────────┐
│  Services / Repositories            │
│  ├── authService, userServices      │
│  └── userRepository, auditRepository│
│      refreshTokenRepository,        │
│      revokedTokenRepository         │
└─────────────────────────────────────┘
      │
      ▼
┌─────────────────────────────────────┐
│  Config / db.js (pool mysql2)       │
│  envLoader.js (carga .env sin dotenv)│
└─────────────────────────────────────┘
      │
      ▼
┌─────────────────────────────────────┐
│  MySQL 8.0 (autos_colombia)         │
└─────────────────────────────────────┘
```

Los movimientos (entrada, salida, reubicación) se ejecutan dentro de **transacciones** y registran su auditoría en la misma conexión.

### 2.3 Arquitectura del frontend

```text
React (Vite)
├── main.jsx                 # Punto de entrada (StrictMode + BrowserRouter + AuthProvider)
├── App.jsx                  # Ruta pública (/login) y resto protegido
├── routes/AppRoutes.jsx     # Layout privado (Sidebar + Navbar) y rutas por rol
├── features/
│   ├── auth/                # LoginPage y AuthContext (sesión, errores, logout)
│   ├── users/               # Listado y formulario de usuarios (admin)
│   └── celdas/              # Gestión de celdas y reubicación (admin)
├── pages/                   # Dashboards, IngresoSalida, HistorialAccesos, VistaVacia
├── Components/
│   ├── layout/              # Sidebar, SidebarData, Navbar
│   ├── ingreso-salida/      # FormularioIngreso/Salida, PanelVehiculo/Movimiento, AlertaPlaca
│   ├── ResumenCeldas.jsx    # Tarjetas y tabla de resumen de celdas
│   └── ProtectedRoute.jsx   # Exige sesión y, opcionalmente, rol
├── services/api.js          # Cliente HTTP (fetch) con JWT y refresh automático
└── validators/placa.js      # Validación y normalización de placas
```

---

## 3. Stack tecnológico

| Capa                | Tecnología               | Versión | Propósito                                                                      |
| ------------------- | ------------------------ | ------- | ------------------------------------------------------------------------------ |
| Runtime             | Node.js                  | 18+     | Entorno de ejecución del backend                                               |
| Framework backend   | Express                  | ^5.3.0  | Servidor web y enrutamiento REST (errores async reenviados al manejador final) |
| Base de datos       | MySQL                    | 8.0+    | Motor relacional                                                               |
| Driver MySQL        | mysql2                   | ^3.11.0 | Pool de conexiones y consultas (promises)                                      |
| Autenticación       | jsonwebtoken             | ^9.0.2  | Tokens JWT de acceso (con `jti` para revocación)                               |
| Hash de contraseñas | bcryptjs                 | ^2.4.3  | Cifrado de claves de usuarios                                                  |
| Seguridad HTTP      | helmet                   | ^8.3.0  | Headers de seguridad                                                           |
| Rate limiting       | express-rate-limit       | ^8.7.2  | Límite de peticiones por IP                                                    |
| CORS                | cors                     | ^2.8.6  | Control de origen cruzado                                                      |
| Dev backend         | nodemon                  | ^3.1.14 | Recarga automática en desarrollo                                               |
| Pruebas backend     | node:test                | nativo  | Pruebas unitarias e integración                                                |
| Frontend framework  | React                    | ^19.3.1 | Interfaz de usuario                                                            |
| Build tool          | Vite                     | ^8.3.4  | Servidor de dev y build de producción                                          |
| Routing             | React Router DOM         | ^7.18.4 | Navegación SPA                                                                 |
| HTTP client         | `fetch` nativo           | —       | Llamadas a la API (el paquete `axios` está declarado pero no se usa)           |
| UI Components       | Material UI              | ^9.5.0  | Iconos y diálogos (el resto de estilos son CSS propios)                        |
| Estilos             | CSS propio + Emotion/MUI | ^11.x   | Estilos de la interfaz                                                         |
| Linter              | oxlint                   | ^1.88.0 | Análisis estático de código                                                    |

---

## 4. Estructura del proyecto

```text
Auto_Colombia/
├── .gitignore
├── README.md
├── generar-reporte.ps1          # Genera un reporte de texto con árbol y contenido del proyecto (PowerShell)
├── backend/
│   ├── .env
│   ├── .env.example
│   ├── .gitignore
│   ├── package.json
│   ├── package-lock.json
│   ├── migrations/
│   │   ├── 001_initial_schema.sql
│   │   ├── 002_add_sesion_activa.sql
│   │   ├── 003_add_mantenimiento_hasta.sql
│   │   ├── 004_create_audit_log.sql
│   │   ├── 005_create_revoked_tokens.sql
│   │   └── 006_create_refresh_tokens.sql
│   ├── Script/
│   │   ├── parqueadero.sql
│   │   ├── parqueadero.mwb         # Modelo de MySQL Workbench
│   │   ├── parqueadero.mwb.bak
│   │   └── migracion_sesion_activa.sql
│   ├── src/
│   │   ├── app.js
│   │   ├── server.js
│   │   ├── config/
│   │   │   ├── db.js
│   │   │   └── envLoader.js
│   │   ├── controllers/
│   │   │   ├── authController.js
│   │   │   ├── celdaController.js
│   │   │   ├── movimientoController.js
│   │   │   ├── userController.js
│   │   │   └── vehiculoController.js
│   │   ├── middleware/
│   │   │   ├── authMiddleware.js
│   │   │   ├── roleMiddleware.js
│   │   │   └── validation.js
│   │   ├── repositories/
│   │   │   ├── auditRepository.js
│   │   │   ├── refreshTokenRepository.js
│   │   │   ├── revokedTokenRepository.js
│   │   │   └── userRepository.js
│   │   ├── routes/
│   │   │   ├── index.js
│   │   │   ├── authRoutes.js
│   │   │   ├── celdas.js
│   │   │   ├── movimientos.js
│   │   │   ├── userRoutes.js
│   │   │   └── vehiculos.js
│   │   ├── seed/
│   │   │   ├── seed.js
│   │   │   └── catalogoVehiculos.js
│   │   ├── services/
│   │   │   ├── authService.js
│   │   │   └── userServices.js
│   │   └── validators/
│   │       └── placa.js
│   └── test/
│       ├── auth.integration.test.js
│       ├── celdas.integration.test.js
│       ├── jwt.test.js
│       ├── mensualidades.test.js
│       ├── movimientos.integration.test.js
│       ├── usuarios.integration.test.js
│       └── validators.test.js
└── frontend/
    ├── .env
    ├── .gitignore
    ├── .oxlintrc.json
    ├── index.html
    ├── package.json
    ├── vite.config.js
    └── src/
        ├── main.jsx
        ├── App.jsx
        ├── App.css
        ├── Components/
        │   ├── ProtectedRoute.jsx
        │   ├── ResumenCeldas.jsx
        │   ├── ingreso-salida/   # AlertaPlaca, FormularioIngreso, FormularioSalida, PanelMovimiento, PanelVehiculo
        │   └── layout/           # Navbar, Sidebar, SidebarData (+ CSS)
        ├── features/
        │   ├── auth/             # context/AuthContext.jsx, pages/LoginPage.jsx
        │   ├── celdas/           # pages/CeldasPage.jsx
        │   └── users/            # pages/UserListPage.jsx, UserFormPage.jsx
        ├── pages/                # DashboardAdmin, DashboardOperador, HistorialAccesos, IngresoSalida, VistaVacia, CSS
        ├── routes/               # AppRoutes.jsx
        ├── services/             # api.js
        └── validators/           # placa.js
```

---

## 5. Requisitos previos

| Herramienta                | Versión recomendada | Propósito                                          |
| -------------------------- | ------------------- | -------------------------------------------------- |
| Node.js                    | 18 o superior       | Entorno de ejecución                               |
| npm                        | 9 o superior        | Gestor de paquetes                                 |
| MySQL Server               | 8.0.16+             | Motor de base de datos (columnas generadas, CHECK) |
| MySQL Workbench (opcional) | —                   | Administración visual de BD                        |
| Git                        | 2.0+                | Control de versiones                               |

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
```

> El script `parqueadero.sql` actual ya incluye todas estas tablas/columnas. Las migraciones se mantienen para actualizar bases creadas con versiones anteriores.

### Paso 7: Sembrar datos iniciales

Desde `backend/`:

```bash
npm run seed           # Siembra solo si la base está vacía
npm run seed:reset     # Vacía todas las tablas y vuelve a sembrar
```

---

## 7. Variables de entorno

El backend lee `backend/.env` con un cargador propio (`envLoader.js`, sin `dotenv`). Si falta `DB_USER` o `DB_NAME` el servidor no arranca y muestra cuál falta; si falta `JWT_SECRET` el middleware de autenticación lanza un error al iniciar.

### Backend (`backend/.env`)

| Variable         | Valor por defecto       | Descripción                                                                                                                |
| ---------------- | ----------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `NODE_ENV`       | `development`           | Entorno de ejecución. En `development` el rate limit global sube a 300 peticiones/15 min                                   |
| `PORT`           | `3000`                  | Puerto del servidor Express                                                                                                |
| `DB_HOST`        | `localhost`             | Host de MySQL                                                                                                              |
| `DB_PORT`        | `3306`                  | Puerto de MySQL                                                                                                            |
| `DB_USER`        | — (obligatoria)         | Usuario de MySQL                                                                                                           |
| `DB_PASSWORD`    | vacío                   | Contraseña de MySQL                                                                                                        |
| `DB_NAME`        | — (obligatoria)         | Nombre de la base de datos (`autos_colombia`)                                                                              |
| `TRUST_PROXY`    | `0`                     | Número de proxies delante de la app (`0` ninguno, `1` Nginx/LB, etc.) para que `req.ip` y el rate limiting usen la IP real |
| `CORS_ORIGIN`    | `http://localhost:5173` | Origen del frontend (ver nota en la sección 20)                                                                            |
| `JWT_SECRET`     | — (obligatoria)         | Clave secreta para firmar los JWT. Se recomienda un valor largo y aleatorio (mín. 32 caracteres)                           |
| `JWT_EXPIRES_IN` | `8h`                    | Tiempo de expiración del token de acceso                                                                                   |

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
- Índices únicos que previenen sobrecupo (`uq_acceso_vehiculo_dentro`, `uq_acceso_celda_ocupada`).
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
- 2 usuarios: `operador` (operador) y `admin` (administrador), clave `123456` en ambos.
- 80 vehículos con propietario integrado: `CAR001`–`CAR070` y `MOT01A`–`MOT10A`.
- Mensualidades de prueba:
  - **Al día:** `CAR001`–`CAR005` y `MOT01A`–`MOT08A`.
  - **En mora:** `CAR006` y `MOT09A`.
  - **Sin mensualidad:** el resto de vehículos (por ejemplo `CAR007`).

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

### 9.4 Verificar funcionamiento

```bash
curl http://localhost:3000/api/health
# Respuesta esperada:
# { "status": "ok", "message": "API Auto Colombia funcionando" }
```

---

## 10. Autenticación y autorización

La API utiliza **JWT (Bearer)**. Las rutas protegidas requieren el header:

```http
Authorization: Bearer <token>
```

En cada petición el middleware `autenticar` valida el token, verifica que su `jti` no esté revocado, carga el usuario desde la base de datos y rechaza usuarios inactivos (403).

### 10.1 Roles

| Rol             | Permisos principales                                                                                                                                 |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `administrador` | Todo: gestión de usuarios, celdas (crear, editar tipo, estado, mantenimiento, eliminar), reubicación de vehículos, además de lo que hace el operador |
| `operador`      | Ingreso/salida de vehículos, consulta de vehículos, celdas y historial, creación/edición/activación de vehículos                                     |

### 10.2 Endpoints de autenticación

| Método | Endpoint                    | Descripción                                                            | Autenticación              |
| ------ | --------------------------- | ---------------------------------------------------------------------- | -------------------------- |
| `POST` | `/api/auth/login`           | Iniciar sesión (devuelve `token` y `refresh_token`)                    | No                         |
| `POST` | `/api/auth/refresh`         | Renovar token de acceso (rota el refresh token)                        | No (refresh token en body) |
| `POST` | `/api/auth/register`        | Registrar usuario                                                      | Sí (admin)                 |
| `GET`  | `/api/auth/me`              | Datos del usuario autenticado                                          | Sí                         |
| `POST` | `/api/auth/verify-password` | Re-autenticar al administrador (antes de acciones sensibles)           | Sí (admin)                 |
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
    "id_usuario": 2,
    "usuario_login": "admin",
    "rol": "administrador",
    "nombres": "Administrador",
    "apellidos": "Principal",
    "nombreCompleto": "Administrador Principal",
    "estado": "activo"
  }
}
```

### 10.4 Seguridad adicional

- **Rate limiting**: 100 req/15 min por IP (300 en `development`) y 10 req/15 min para `/api/auth/login`. `/api/health` no cuenta.
- **Anti fuerza bruta**: bloqueo temporal (423) tras 5 intentos fallidos en 15 minutos (por usuario o por IP).
- **Tokens revocados**: el logout agrega el `jti` del JWT a `revoked_tokens`.
- **Refresh token rotation**: cada refresh revoca el token anterior y emite uno nuevo (duración 7 días).
- **Refresh automático en el cliente**: si una petición recibe 401 y hay refresh token, el frontend renueva el access token y reintenta **una sola vez**; las renovaciones concurrentes se serializan para no invalidar el refresh token.
- **Re-autenticación del administrador**: crear usuarios, editar usuarios y restablecer claves piden la clave del administrador (ver 12.3).
- **Auditoría**: login/logout y movimientos (entrada, salida, reubicación) se registran en `audit_log`.
- **Sesión activa**: `usuarios.sesion_activa` se marca al iniciar sesión y se limpia al cerrar sesión o desactivar al usuario.

---

## 11. API REST y endpoints

La API expone los siguientes endpoints bajo el prefijo `/api`. Salvo `/api/health`, `/api/auth/login` y `/api/auth/refresh`, todas las rutas requieren `Authorization: Bearer <token>`. Las rutas inexistentes bajo `/api` responden `404 { "error": "Ruta no encontrada" }`.

### 11.1 Resumen de endpoints

| Método   | Endpoint                            | Descripción                                                         | Rol                     |
| -------- | ----------------------------------- | ------------------------------------------------------------------- | ----------------------- |
| `GET`    | `/api/health`                       | Estado de la API                                                    | Público                 |
| `POST`   | `/api/auth/login`                   | Iniciar sesión                                                      | Público                 |
| `POST`   | `/api/auth/refresh`                 | Renovar token                                                       | Público (refresh token) |
| `POST`   | `/api/auth/register`                | Registrar usuario                                                   | Admin                   |
| `GET`    | `/api/auth/me`                      | Usuario autenticado                                                 | Auth                    |
| `POST`   | `/api/auth/verify-password`         | Verificar la clave del administrador                                | Admin                   |
| `POST`   | `/api/auth/logout`                  | Cerrar sesión                                                       | Auth                    |
| `GET`    | `/api/users`                        | Listar/buscar usuarios (`search`, `rol`, `estado`, `page`, `limit`) | Admin                   |
| `GET`    | `/api/users/:id`                    | Obtener usuario                                                     | Admin                   |
| `PUT`    | `/api/users/:id`                    | Editar usuario y rol (requiere `claveAdmin`)                        | Admin                   |
| `PATCH`  | `/api/users/:id/estado`             | Activar/desactivar                                                  | Admin                   |
| `PATCH`  | `/api/users/:id/password`           | Restablecer clave (requiere `clave` y `claveAdmin`)                 | Admin                   |
| `GET`    | `/api/vehiculos`                    | Listar/buscar vehículos (`q`, `tipo`, `activo`, `page`, `limit`)    | Auth                    |
| `GET`    | `/api/vehiculos/:placa`             | Consultar vehículo activo por placa                                 | Auth                    |
| `POST`   | `/api/vehiculos`                    | Registrar vehículo + propietario                                    | Admin/Operador          |
| `PUT`    | `/api/vehiculos/:placa`             | Editar vehículo y propietario                                       | Admin/Operador          |
| `PATCH`  | `/api/vehiculos/:placa/estado`      | Activar/desactivar vehículo (no si está dentro)                     | Admin/Operador          |
| `PUT`    | `/api/vehiculos/:placa/celda`       | **Obsoleto** → `410 Gone` (celdas fijas retiradas)                  | Admin                   |
| `DELETE` | `/api/vehiculos/:placa/celda`       | **Obsoleto** → `410 Gone`                                           | Admin                   |
| `GET`    | `/api/celdas`                       | Listar celdas (`tipo`, `bloque`, `estado`, `page`, `limit`)         | Auth                    |
| `GET`    | `/api/celdas/disponibles`           | Celdas libres, opcionalmente por `tipo`                             | Auth                    |
| `GET`    | `/api/celdas/resumen`               | Resumen por tipo y totales                                          | Auth                    |
| `GET`    | `/api/celdas/bloques`               | Celdas agrupadas por bloque                                         | Auth                    |
| `GET`    | `/api/celdas/tipos`                 | Tipos de vehículo activos                                           | Auth                    |
| `GET`    | `/api/celdas/:id`                   | Obtener celda con su estado                                         | Auth                    |
| `POST`   | `/api/celdas`                       | Crear celda                                                         | Admin                   |
| `PUT`    | `/api/celdas/:id`                   | Cambiar el tipo de vehículo de la celda                             | Admin                   |
| `PATCH`  | `/api/celdas/:id/estado`            | Activar/inactivar o poner/quitar mantenimiento                      | Admin                   |
| `DELETE` | `/api/celdas/:id`                   | Eliminar celda (solo libre y sin historial)                         | Admin                   |
| `GET`    | `/api/movimientos/historial`        | Historial de accesos con filtros                                    | Auth                    |
| `POST`   | `/api/movimientos/entrada`          | Registrar ingreso                                                   | Auth                    |
| `POST`   | `/api/movimientos/salida`           | Registrar salida                                                    | Auth                    |
| `PATCH`  | `/api/movimientos/:id_acceso/celda` | Reubicar un vehículo que está dentro                                | Admin                   |

### 11.2 Health check

**`GET /api/health`**

```json
{
  "status": "ok",
  "message": "API Auto Colombia funcionando"
}
```

### 11.3 Consultar vehículo por placa

**`GET /api/vehiculos/:placa`**

- `placa`: formato colombiano; se normaliza (mayúsculas, sin espacios ni guiones). Solo devuelve vehículos **activos**.

Respuesta exitosa (200):

```json
{
  "id": 1,
  "placa": "CAR001",
  "estado": "Adentro",
  "mensualidad": 250000,
  "tipo": "Carro",
  "tipoCodigo": "carro",
  "modelo": "2022",
  "nombreModelo": "Mazda CX-5",
  "color": "Rojo",
  "usuario": "Carlos Perez",
  "estadoMensualidad": "Al día"
}
```

`estadoMensualidad` toma los valores `Al día`, `En mora` o `Sin mensualidad`.

| Código | Motivo                              |
| ------ | ----------------------------------- |
| 400    | Formato de placa inválido           |
| 404    | Vehículo no encontrado (o inactivo) |
| 500    | Error interno del servidor          |

### 11.4 Consultar celdas disponibles

**`GET /api/celdas/disponibles?tipo=carro|moto`**

Devuelve las celdas activas, fuera de mantenimiento y sin acceso abierto. Antes de responder libera los mantenimientos vencidos.

```json
[
  {
    "id_celda": 5,
    "codigo": "A-05",
    "id_tipo_vehiculo": 1,
    "letra": "A",
    "numero": 5
  }
]
```

### 11.5 Listar, resumir y agrupar celdas

**`GET /api/celdas`** — filtros opcionales: `tipo` (`carro|moto`), `bloque` (letra), `estado` (`libre | ocupada | en mantenimiento | inactiva`), `page` (por defecto 1) y `limit` (por defecto 20, máximo 100). Responde `{ rows, total, page, limit }`; cada fila incluye `estado` derivado y `placa_ocupante`.

**`GET /api/celdas/resumen`** — responde `{ porTipo: [...], totales: {...} }` con `total`, `libres`, `ocupadas` y `no_disponibles` (inactivas + en mantenimiento). El campo `asignadas` se mantiene por compatibilidad y siempre vale 0.

**`GET /api/celdas/bloques`** — responde `[{ bloque: "A", celdas: [...] }, ...]` para la vista visual por bloques.

### 11.6 Registrar ingreso de vehículo

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
  "id": 101,
  "placa": "CAR001",
  "tipo": "Carro",
  "celda": "A-05",
  "accion": "entrada",
  "fecha": "22/10/2026",
  "hora": "14:30"
}
```

| Código | Motivo                                                                                                                      |
| ------ | --------------------------------------------------------------------------------------------------------------------------- |
| 400    | Placa o celda faltantes; placa inválida; vehículo ya está adentro; celda inexistente, deshabilitada, ocupada o de otro tipo |
| 403    | El vehículo **no tiene mensualidad activa** o la mensualidad **está en mora**                                               |
| 404    | Vehículo no encontrado o inactivo                                                                                           |
| 409    | Carrera de concurrencia: el vehículo ya está adentro o la celda ya fue ocupada (índices únicos)                             |
| 500    | Error interno                                                                                                               |

### 11.7 Registrar salida de vehículo

**`POST /api/movimientos/salida`**

```json
{
  "placa": "CAR001"
}
```

Respuesta exitosa (200):

```json
{
  "id": 101,
  "placa": "CAR001",
  "tipo": "Carro",
  "celda": "A-05",
  "accion": "salida",
  "fecha": "22/10/2026",
  "hora": "15:45"
}
```

| Código | Motivo                                                       |
| ------ | ------------------------------------------------------------ |
| 400    | Placa requerida, placa inválida, el vehículo no está adentro |
| 404    | Vehículo no encontrado                                       |
| 500    | Error interno del servidor                                   |

### 11.8 Reubicar un vehículo (administrador)

**`PATCH /api/movimientos/:id_acceso/celda`**

```json
{
  "id_celda": 12
}
```

Respuesta exitosa (200):

```json
{
  "id": 101,
  "placa": "CAR001",
  "celda_origen": "A-05",
  "celda": "A-12",
  "accion": "reubicacion"
}
```

| Código | Motivo                                                                             |
| ------ | ---------------------------------------------------------------------------------- |
| 400    | Acceso o celda faltantes; celda inexistente, deshabilitada, de otro tipo u ocupada |
| 404    | Acceso no encontrado o el vehículo ya salió                                        |
| 500    | Error interno                                                                      |

### 11.9 Historial de accesos

**`GET /api/movimientos/historial`** — filtros opcionales: `placa`, `celda`, `operador` (nombre o apellido del operador de ingreso/salida), `estado` (`adentro | fuera`, evalúa el último acceso de cada vehículo), `fecha_desde`, `fecha_hasta` (fecha de ingreso en hora de Bogotá), `page` y `limit` (máx. 100). Responde `{ rows, total, page, limit }`.

### 11.10 Gestión de celdas (administrador)

| Operación                      | Cuerpo                                                                     | Reglas                                                                                                                                    |
| ------------------------------ | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `POST /api/celdas`             | `{ letra, numero, id_tipo_vehiculo }`                                      | Letra A–Z, número ≥ 1, posición única (409 si existe); máximo **70 celdas de carro** y **10 de moto** (400 si se excede)                  |
| `PUT /api/celdas/:id`          | `{ id_tipo_vehiculo }`                                                     | Cambia el tipo de la celda; valida que el tipo exista                                                                                     |
| `PATCH /api/celdas/:id/estado` | `{ activa: bool }` y/o `{ en_mantenimiento: bool, minutos_mantenimiento }` | La duración del mantenimiento por defecto es 60 min y debe ser ≥ 1; **no se puede inactivar ni poner en mantenimiento una celda ocupada** |
| `DELETE /api/celdas/:id`       | —                                                                          | Solo si no está ocupada y no tiene historial de accesos                                                                                   |

### 11.11 Gestión de usuarios (administrador)

- **`POST /api/auth/register`** — campos obligatorios: `rol`, `tipo_documento` (`cc | ce | nit | pasaporte`), `documento` (5–20 caracteres), `nombres`, `apellidos`, `usuario_login` (mín. 3), `clave` (mín. 4); opcionales `telefono` y `email` (formato válido y único). Responde 409 si documento, login o correo ya existen.
- **`PUT /api/users/:id`** — requiere `claveAdmin` en el cuerpo (422 si falta, 400 si es incorrecta). No permite que un administrador cambie su propio rol. El estado no se modifica por esta ruta.
- **`PATCH /api/users/:id/estado`** — `{ estado: "activo" | "inactivo" }`. Un administrador no puede desactivarse a sí mismo; al desactivar se cierra la sesión activa.
- **`PATCH /api/users/:id/password`** — `{ clave, claveAdmin }`; la nueva clave debe tener al menos 4 caracteres.

---

## 12. Flujos del sistema

### 12.1 Ingreso de vehículo

1. El operador (autenticado) ingresa la placa; el frontend valida el formato y consulta el vehículo.
2. Si la placa ya está adentro, se avisa y no se permite el ingreso. Si la mensualidad está **en mora o no existe**, el vehículo se muestra pero el botón de ingreso queda bloqueado.
3. El frontend lista solo las celdas **libres del mismo tipo** del vehículo y el operador elige una.
4. El backend revalida: formato de placa, vehículo activo, placa coherente con su tipo, que no esté ya adentro y que tenga **mensualidad activa y vigente** (403 en caso contrario).
5. Verifica que la celda exista, esté activa, no esté en mantenimiento, sea compatible con el tipo y esté libre.
6. Resuelve el operador autenticado, su turno abierto (crea uno si no existe) y la primera puerta activa.
7. Registra el acceso en `accesos_vehiculos` y la auditoría dentro de una transacción.
8. La celda pasa a estado `ocupada` hasta que se registre la salida.

Los formularios de ingreso y salida se **limpian solos tras 35 segundos** de inactividad.

### 12.2 Salida de vehículo

1. El operador ingresa la placa; el frontend verifica que el vehículo esté adentro.
2. El backend valida el formato, que el vehículo exista y que tenga un acceso abierto.
3. Resuelve operador, turno y puerta.
4. Cierra el acceso (`fecha_salida`, operador, puerta y turno de salida), registra la auditoría y libera la celda inmediatamente.

### 12.3 Creación y gestión de usuarios (administrador)

El rol `administrador` gestiona el personal del parqueadero (operadores y otros administradores). Los clientes del parqueadero no son usuarios; sus datos viven en `vehiculos`.

1. En **Usuarios → Nuevo usuario** el sistema pide primero la **clave del administrador** (`POST /api/auth/verify-password`) y luego abre el formulario.
2. Se completan rol, tipo y número de documento, nombres, apellidos, correo, teléfono, usuario de login y clave (con confirmación).
3. `POST /api/auth/register` valida los campos y que documento, login y correo no estén duplicados.
4. La clave se guarda cifrada con bcrypt en `clave_hash`; el usuario queda `activo`.
5. **Editar** y **Clave (restablecer)** también piden confirmar la clave del administrador en el frontend, y el backend la vuelve a validar (`claveAdmin`) como segunda capa.
6. El listado muestra si cada usuario está **Conectado / Desconectado** y su último acceso, y se refresca cada 5 segundos.

| Rol             | Qué puede hacer                                                                                                  |
| --------------- | ---------------------------------------------------------------------------------------------------------------- |
| `administrador` | Gestiona usuarios, celdas, reubicaciones, consulta historial y dashboard completo; accede a todas las rutas.     |
| `operador`      | Registra ingresos y salidas, consulta vehículos, celdas, historial y su dashboard; crea/edita vehículos por API. |

### 12.4 Creación y gestión de celdas (administrador)

1. En **Celdas** el administrador crea una celda indicando bloque (A–Z), número y tipo (`POST /api/celdas`).
2. El backend valida la posición única y los límites por tipo (70 carro / 10 moto). El código se genera automáticamente (`LETRA-NÚMERO`, ej. `A-05`).
3. Desde la lista puede **cambiar el tipo**, **inactivar/activar**, **eliminar** (solo celdas libres sin historial) o poner en **mantenimiento** indicando horas y minutos.
4. Al vencer `mantenimiento_hasta` la celda se libera automáticamente (se procesa en cada consulta de celdas).
5. La vista **Por bloques** muestra todas las celdas coloreadas por estado.

| Estado             | Qué significa                                                                              |
| ------------------ | ------------------------------------------------------------------------------------------ |
| `libre`            | Activa, fuera de mantenimiento y sin acceso abierto. Puede usarse para ingresos.           |
| `ocupada`          | Tiene un acceso abierto (`fecha_salida IS NULL`). Bloquea nuevos ingresos hasta la salida. |
| `en mantenimiento` | Fuera de servicio temporal hasta `mantenimiento_hasta`.                                    |
| `inactiva`         | Deshabilitada hasta que se reactive.                                                       |

### 12.5 Reubicación de un vehículo (administrador)

1. En **Celdas → Lista**, las celdas `ocupada` muestran el botón **reubicar**.
2. El sistema consulta las celdas libres del mismo tipo y localiza el acceso abierto de esa celda en el historial.
3. El administrador elige la celda destino y confirma.
4. `PATCH /api/movimientos/:id_acceso/celda` valida que la celda esté habilitada, libre y sea del tipo del vehículo, actualiza el acceso y registra la acción `reubicacion` en `audit_log`.

---

## 13. Reglas de negocio y restricciones

| Área                        | Regla                                                                                                                                                                      |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Placas**                  | Carro: `AAA###` · Moto: `AAA##X` (validación en backend y frontend) y debe coincidir con el tipo del vehículo                                                              |
| **Celdas**                  | Una celda está ocupada si existe un acceso con `fecha_salida IS NULL`                                                                                                      |
| **Celdas rotativas**        | No hay celdas fijas por vehículo; cada ingreso elige una celda libre del mismo tipo                                                                                        |
| **Límites de celdas**       | Máximo 70 celdas de carro y 10 de moto al crear nuevas                                                                                                                     |
| **Sobrecupo**               | Índices únicos `uq_acceso_vehiculo_dentro` y `uq_acceso_celda_ocupada` impiden duplicados incluso con peticiones simultáneas                                               |
| **Mensualidades**           | Se toma la mensualidad `activa` con mayor `fecha_fin`; está vigente si `fecha_fin >=` la fecha de hoy en Bogotá (UTC‑5). Estados: Al día / En mora / Sin mensualidad       |
| **Ingreso**                 | Solo con mensualidad activa y vigente; en mora o sin mensualidad el backend responde 403                                                                                   |
| **Cobro**                   | Solo por mensualidad (tarifa en `tipos_vehiculos.tarifa_mensual`). No existen tarifas por hora/día                                                                         |
| **Operador/Turno**          | Resueltos a partir del usuario autenticado (JWT). Se crea un turno abierto si no existe                                                                                    |
| **Puerta**                  | Se usa la primera puerta activa configurada en la base de datos                                                                                                            |
| **Mantenimiento**           | Una celda en mantenimiento no recibe vehículos; tiene fecha de fin y se libera automáticamente. No se puede aplicar a una celda ocupada                                    |
| **Inactivar vehículo**      | No se permite si el vehículo está dentro del parqueadero                                                                                                                   |
| **Eliminar celda**          | Solo si no está ocupada y no tiene historial de accesos                                                                                                                    |
| **Reubicación**             | Solo administrador; la celda destino debe estar libre, habilitada y ser del mismo tipo                                                                                     |
| **Usuarios (crear)**        | Solo `administrador` vía `POST /api/auth/register`. Valida unicidad de documento, login y correo; clave de mínimo 4 caracteres cifrada con bcrypt; estado inicial `activo` |
| **Usuarios (editar/clave)** | Requieren `claveAdmin`. Un administrador no puede cambiar su propio rol ni desactivarse                                                                                    |
| **Intentos de login**       | 5 fallidos en 15 min (por usuario o IP) bloquean el acceso temporalmente (423)                                                                                             |
| **Roles**                   | `administrador` y `operador`; las rutas sensibles requieren rol específico                                                                                                 |
| **Zona horaria**            | Las fechas se almacenan en UTC y se presentan en `America/Bogota`                                                                                                          |

---

## 14. Esquema de base de datos

### 14.1 Mapa de tablas

| Tabla               | Descripción                                                                                                                   |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `usuarios`          | Login de administrador y operador (solo staff, no clientes). Incluye `sesion_activa`, `fecha_sesion_activa` y `ultimo_acceso` |
| `tipos_vehiculos`   | Moto y carro, con tarifa mensual fija                                                                                         |
| `celdas`            | Spots físicos (letra-número) tipificados por tipo de vehículo; `activa`, `en_mantenimiento` y `mantenimiento_hasta`           |
| `puertas`           | Entradas/salidas del parqueadero                                                                                              |
| `vehiculos`         | Placa, tipo, color, modelo y **datos del propietario integrados** (nombre, tipo y número de documento, teléfono, correo)      |
| `turnos`            | Turno por operador; uno abierto a la vez                                                                                      |
| `mensualidades`     | Período contratado por vehículo (`fecha_inicio`, `fecha_fin`, `valor`, `estado`)                                              |
| `pagos`             | Pago de una mensualidad, dentro de un turno                                                                                   |
| `accesos_vehiculos` | Ingreso/salida del vehículo (bitácora); guarda operador, puerta y turno de ingreso y de salida                                |
| `novedades`         | Incidentes sobre un vehículo o acceso                                                                                         |
| `login_attempts`    | Anti fuerza bruta para admin/operador                                                                                         |
| `audit_log`         | Auditoría de acciones                                                                                                         |
| `revoked_tokens`    | Revocación de JWT por `jti`                                                                                                   |
| `refresh_tokens`    | Sesiones persistentes (refresh tokens)                                                                                        |

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

---

## 15. Frontend: pantallas y rutas

| Ruta                             | Pantalla                                                                                                                                                                                              | Acceso        |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- |
| `/login`                         | Inicio de sesión                                                                                                                                                                                      | Público       |
| `/dashboard`                     | Panel de administración u operador: resumen de celdas (total, libres, ocupadas, no disponibles) por tipo, actualizado cada 5 s; el panel de administrador incluye accesos rápidos y total de usuarios | Autenticado   |
| `/vehiculo`                      | **Historial de accesos** con filtros (placa, celda, operador, estado, fechas) y paginación                                                                                                            | Autenticado   |
| `/ingreso/salida`                | Tarjetas **Ingresar** y **Salir** lado a lado, con alertas de placa (vacía, formato inválido, no registrada, ya procesada, ingreso bloqueado por mensualidad)                                         | Autenticado   |
| `/mensualidad`                   | Vista vacía (módulo pendiente)                                                                                                                                                                        | Autenticado   |
| `/users`                         | Listado de usuarios: búsqueda, filtros, estado de conexión, editar, clave, activar/desactivar                                                                                                         | Administrador |
| `/users/new` · `/users/:id/edit` | Formulario de usuario (la edición pide la clave del administrador)                                                                                                                                    | Administrador |
| `/celdas`                        | Gestión de celdas: crear, filtrar, vista Lista / Por bloques, mantenimiento, activar/inactivar, cambiar tipo, eliminar y reubicar                                                                     | Administrador |

El menú lateral muestra Dashboard, Vehículo, Ingreso/Salida y Mensualidades a todos los usuarios, y Usuarios y Celdas solo a administradores. Las rutas desconocidas redirigen a `/dashboard`. En pantallas ≤ 768 px el menú se pliega a solo iconos.

---

## 16. Scripts disponibles

### Backend (`backend/package.json`)

| Script       | Comando                                           | Descripción                                   |
| ------------ | ------------------------------------------------- | --------------------------------------------- |
| `dev`        | `nodemon src/server.js`                           | Servidor de desarrollo con recarga automática |
| `start`      | `node src/server.js`                              | Servidor en modo producción                   |
| `seed`       | `node src/seed/seed.js`                           | Siembra datos iniciales si la base está vacía |
| `seed:reset` | `node src/seed/seed.js --reset`                   | Vacía todas las tablas y vuelve a sembrar     |
| `test`       | `node --test --test-force-exit test/**/*.test.js` | Ejecuta las pruebas (unitarias e integración) |

### Frontend (`frontend/package.json`)

| Script    | Comando        | Descripción                          |
| --------- | -------------- | ------------------------------------ |
| `dev`     | `vite`         | Servidor de desarrollo con HMR       |
| `build`   | `vite build`   | Build de producción                  |
| `lint`    | `oxlint`       | Análisis estático de código          |
| `preview` | `vite preview` | Vista previa del build de producción |

### Utilidad en la raíz

| Archivo               | Descripción                                                                                                                 |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `generar-reporte.ps1` | Script de PowerShell que genera un reporte de texto con el árbol de directorios y el contenido de los archivos del proyecto |

---

## 17. Pruebas

Se ejecutan desde `backend/` con `npm test` usando el runner nativo `node:test`. Las pruebas de integración usan la **base de datos real** configurada en `.env`, así que requieren la base creada y sembrada (`npm run seed`) y **modifican datos temporalmente** (hacen limpieza al final).

| Archivo                           | Qué cubre                                                                                                                    |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `validators.test.js`              | Normalización y validación de placas (carro, moto, por tipo)                                                                 |
| `jwt.test.js`                     | Generación y verificación de tokens JWT                                                                                      |
| `mensualidades.test.js`           | Estado de mensualidad: al día (`CAR001`), en mora (`CAR006`), sin mensualidad (`CAR007`)                                     |
| `auth.integration.test.js`        | Login exitoso/fallido y revocación del token en logout                                                                       |
| `usuarios.integration.test.js`    | Registro, duplicados (409), listado, desactivación con cierre de sesión y restablecimiento de clave                          |
| `celdas.integration.test.js`      | Crear duplicada (409), límite por tipo, mantenimiento con duración, inactivar/activar, bloqueo si está ocupada y eliminación |
| `movimientos.integration.test.js` | Entrada y salida, e intento de ingreso duplicado                                                                             |

---

## 18. Estado del proyecto y pendientes

**Implementado:** autenticación y roles, usuarios, celdas, ingreso/salida con control de mensualidad, reubicación, historial, dashboards, auditoría y pruebas del backend.

**Pendiente / parcial:**

- **Módulo de mensualidades:** la regla de vigencia ya se aplica al ingreso, pero no hay endpoints ni pantalla para registrar o renovar mensualidades y pagos (la ruta `/mensualidad` está vacía). Hoy las mensualidades solo se crean con el seed.
- **Interfaz de vehículos:** el registro, edición y búsqueda de vehículos y propietarios existen en la API, pero no tienen pantalla en el frontend.
- **Turnos, pagos y novedades:** las tablas existen, pero aún no tienen endpoints propios.
- **Auditoría de cambios de usuarios:** hoy se auditan login/logout y movimientos; las ediciones de usuarios, cambios de estado y restablecimientos de clave aún no se registran en `audit_log`.

---

## 19. Licencia

Este proyecto está bajo la **Licencia ISC**. Consulta el archivo `LICENSE` o el campo `license` en `backend/package.json` para más información.

> ⚠️ **Aviso:** Las credenciales de ejemplo del seed (`admin` / `123456`, `operador` / `123456`) son solo para entornos de desarrollo. Cámbialas antes de llevar el proyecto a producción.

---

## 20. Notas importantes

- **Sin ORM:** El backend utiliza `mysql2/promise` con consultas SQL parametrizadas nativas.
- **JWT:** Configura un `JWT_SECRET` largo y aleatorio en producción. El código exige que exista, pero no valida su longitud.
- **Rate limiting:** 100 req/15 min global (300 en desarrollo) y 10 req/15 min para login.
- **Variables de entorno:** Nunca subas `.env` al repositorio. Usa `.env.example` como referencia.
- **CORS:** `app.js` está configurado actualmente para aceptar cualquier origen; `CORS_ORIGIN` se carga en `envLoader.js` pero no se aplica. Antes de producción conviene restringir el origen al dominio del frontend.
- **Zona horaria:** Las fechas se guardan en UTC (el pool usa `timezone: "Z"`) y se presentan en `America/Bogota`.
- **Base de datos primero:** Debes crear la base con `Script/parqueadero.sql` antes de ejecutar `npm run seed` o iniciar el servidor.
- **Tokens en el navegador:** el frontend guarda el token de acceso, el refresh token y los datos básicos del usuario en `localStorage`.
- **Dependencias sin uso:** `axios` está declarado en `frontend/package.json`, pero el cliente HTTP usa `fetch`.
- **Pruebas:** Ejecuta `npm test` en `backend/` (requiere BD configurada y sembrada).

---

<div align="center">

**Auto Colombia — Sistema de Parqueadero Vehicular**  
Desarrollado con ❤️ en Node.js, Express, MySQL, React y Vite

[🔝 Volver al inicio](#️-auto-colombia--sistema-de-parqueadero-vehicular)

</div>
