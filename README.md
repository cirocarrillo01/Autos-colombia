# 🅿️ Auto Colombia — Sistema de Parqueadero Vehicular

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-5.3.0-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![MySQL](https://img.shields.io/badge/MySQL-8.0%2B-4479A1?style=for-the-badge&logo=mysql&logoColor=white)](https://www.mysql.com/)
[![React](https://img.shields.io/badge/React-19.3.1-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8.3.4-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Material UI](https://img.shields.io/badge/Material%20UI-9.5.0-007FFF?style=for-the-badge&logo=mui&logoColor=white)](https://mui.com/)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg?style=for-the-badge)](https://opensource.org/licenses/ISC)

Sistema de gestión de ingresos y salidas de vehículos para parqueaderos con celdas numeradas, desarrollado con **backend en Node.js + Express + MySQL** (sin ORM, consultas SQL nativas mediante `mysql2`) y **frontend en React + Vite + Material UI**.

Permite registrar el ingreso y salida de vehículos (carros y motos), validar placas con formato colombiano, controlar mensualidades (al día / en mora / sin mensualidad) y asignar celdas por tipo de vehículo.

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
10. [API REST y endpoints](#10-api-rest-y-endpoints)
11. [Flujo de ingreso y salida](#11-flujo-de-ingreso-y-salida)
12. [Reglas de negocio y restricciones](#12-reglas-de-negocio-y-restricciones)
13. [Esquema de base de datos](#13-esquema-de-base-de-datos)
14. [Scripts disponibles](#14-scripts-disponibles)
15. [Licencia](#15-licencia)
16. [Notas importantes](#16-notas-importantes)

---

## 1. Descripción del proyecto

**Auto Colombia** es un sistema de control de acceso vehicular para parqueaderos que gestiona:

- ✅ **Ingreso y salida de vehículos** (carros y motos) con asignación automática de celda.
- ✅ **Validación de placas** según formato colombiano (`AAA###` para carro, `AAA##X` para moto).
- ✅ **Control de mensualidades**: al día, en mora o sin mensualidad.
- ✅ **Consulta de estado** del vehículo (adentro/fuera, modelo, año, color, propietario, tipo).
- ✅ **Consulta de celdas disponibles** filtradas por tipo de vehículo.
- ✅ **Backend abierto**: actualmente no requiere autenticación JWT; el operador y el turno se resuelven en el backend.
- ✅ **Prevención de sobrecupo**: índices únicos en la base de datos impiden que un vehículo o una celda tengan más de un acceso abierto simultáneamente.

---
---

## 2. Tipo de proyecto y arquitectura

### 2.1 Tipo de proyecto

Aplicación web full-stack dividida en dos carpetas independientes en la raíz:

| Componente | Responsabilidad | Tecnología principal |
|------------|-----------------|----------------------|
| **Backend** | API REST, lógica de negocio, acceso a datos MySQL | Node.js + Express + mysql2 |
| **Frontend** | Interfaz de usuario (SPA) | React + Vite + Material UI |
| **Base de datos** | Almacenamiento relacional de vehículos, celdas, accesos, usuarios, mensualidades | MySQL 8.0+ |

No se utiliza ORM; el backend ejecuta consultas SQL parametrizadas directamente mediante el pool de conexiones de `mysql2/promise`.

### 2.2 Arquitectura del backend

```text
Cliente (React/Vite)
      │ HTTP/JSON (fetch/axios)
      ▼
┌─────────────────────────────────────┐
│  Express (app.js)                   │
│  ├── cors, express.json             │
│  └── montaje de rutas bajo /api     │
└─────────────────────────────────────┘
      │
      ▼
┌─────────────────────────────────────┐
│  Routes (vehiculos, celdas,         │
│  movimientos, health)               │
└─────────────────────────────────────┘
      │
      ▼
┌─────────────────────────────────────┐
│  Controllers                        │
│  ├── vehiculoController.js          │
│  ├── movimientoController.js        │
│  └── celdaController.js             │
└─────────────────────────────────────┘
      │
      ▼
┌─────────────────────────────────────┐
│  Config / db.js (pool mysql2)       │
│  envLoader.js (carga .env)          │
└─────────────────────────────────────┘
      │
      ▼
┌─────────────────────────────────────┐
│  MySQL 8.0 (autos_colombia)         │
└─────────────────────────────────────┘
```

### 2.3 Arquitectura del frontend

```text
React (Vite)
├── main.jsx                 # Punto de entrada (BrowserRouter + StrictMode)
├── App.jsx                  # Rutas (React Router DOM)
├── Components/
│   ├── layout/              # Sidebar, Navbar
│   └── ingreso-salida/      # Formularios y paneles de ingreso/salida
├── pages/
│   ├── IngresoSalida.jsx
│   └── VistasVacia.jsx
├── services/
│   └── api.js               # Capa de llamadas a la API (fetch)
└── validators/
    └── placa.js             # Validación y normalización de placas
```

---

## 3. Stack tecnológico

| Capa | Tecnología | Versión | Propósito |
|------|------------|---------|-----------|
| Runtime | Node.js | 18+ | Entorno de ejecución del backend |
| Framework backend | Express | ^5.3.0 | Servidor web y enrutamiento REST |
| Base de datos | MySQL | 8.0+ | Motor relacional |
| Driver MySQL | mysql2 | ^3.11.0 | Pool de conexiones y consultas (promises) |
| Hash de contraseñas | bcryptjs | ^2.4.3 | Cifrado de claves de usuarios |
| CORS | cors | ^2.8.6 | Control de origen cruzado |
| Dev backend | nodemon | ^3.1.14 | Recarga automática en desarrollo |
| Frontend framework | React | ^19.3.1 | Interfaz de usuario |
| Build tool | Vite | ^8.3.4 | Servidor de dev y build de producción |
| Routing | React Router DOM | ^7.18.4 | Navegación SPA |
| HTTP client | Axios / fetch | ^1.20.0 / nativo | Llamadas a la API REST |
| UI Components | Material UI | ^9.5.0 | Componentes de interfaz |
| Estilos | Emotion / MUI | ^11.x | Estilos en CSS-in-JS |
| Linter | oxlint | ^1.88.0 | Análisis estático de código |

---

## 4. Estructura del proyecto

```text
Auto_Colombia/
├── .gitignore                      # Archivos ignorados por Git (raíz)
├── README.md                       # Documentación del proyecto
├── generar-reporte.ps1             # Script de PowerShell para generar reportes
├── backend/                        # API REST (Node.js + Express + MySQL)
│   ├── .env                        # Variables de entorno (local, no se sube)
│   ├── .env.example                # Plantilla de variables de entorno
│   ├── .gitignore                  # Archivos ignorados del backend
│   ├── package.json                # Dependencias y scripts del backend
│   ├── package-lock.json
│   ├── Script/
│   │   └── parqueadero.sql         # Esquema SQL de la base de datos
│   └── src/
│       ├── app.js                  # Configuración Express y montaje de rutas
│       ├── server.js               # Punto de entrada: conecta DB y levanta servidor
│       ├── config/
│       │   ├── db.js               # Pool de conexiones MySQL (mysql2/promise)
│       │   └── envLoader.js        # Carga .env sin dotenv y valida variables
│       ├── controllers/
│       │   ├── vehiculoController.js   # GET /vehiculos/:placa
│       │   ├── movimientoController.js # POST /movimientos/entrada | salida
│       │   └── celdaController.js      # GET /celdas
│       ├── routes/
│       │   ├── index.js            # Enrutador principal bajo /api
│       │   ├── vehiculos.js
│       │   ├── celdas.js
│       │   └── movimientos.js
│       ├── seed/
│       │   ├── seed.js             # Siembra de datos iniciales (--reset)
│       │   └── catalogoVehiculos.js # Catálogo de modelos y colores
│       └── validators/
│           └── placa.js            # Validación de placas colombianas
└── frontend/                       # SPA (React + Vite + Material UI)
    ├── .env                        # Variables de entorno (VITE_API_URL)
    ├── .gitignore
    ├── .oxlintrc.json
    ├── index.html
    ├── package.json                # Dependencias y scripts del frontend
    ├── package-lock.json
    ├── vite.config.js              # Configuración de Vite
    └── src/
        ├── main.jsx                # Punto de entrada React
        ├── App.jsx                 # Rutas de la aplicación
        ├── App.css
        ├── api.js                  # Servicio de llamadas a la API
        ├── Components/
        │   ├── layout/             # Navbar, Sidebar, SidebarData
        │   └── ingreso-salida/     # Formularios y paneles de ingreso/salida
        ├── pages/
        │   ├── IngresoSalida.jsx
        │   └── VistasVacia.jsx
        ├── services/
        │   └── api.js
        └── validators/
            └── placa.js
```

---

## 5. Requisitos previos

| Herramienta | Versión recomendada | Propósito |
|-------------|---------------------|-----------|
| Node.js | 18 o superior | Entorno de ejecución |
| npm | 9 o superior | Gestor de paquetes |
| MySQL Server | 8.0.16+ | Motor de base de datos |
| MySQL Workbench (opcional) | — | Administración visual de BD |
| Git | 2.0+ | Control de versiones |

---

## 6. Instalación paso a paso

El proyecto se divide en dos partes independientes: **backend** y **frontend**. Cada una tiene su propio `package.json` y se instala por separado.

### Paso 1: Clonar el repositorio

```bash
git clone https://github.com/cirocarrillo01/Autos-colombia.git
cd Autos-colombia
```

### Paso 2: Instalar dependencias del backend

Desde la carpeta `backend/`:

```bash
cd backend
npm install
```

Esto instalará: `express`, `mysql2`, `bcryptjs`, `cors` (producción) y `nodemon` (desarrollo).

### Paso 3: Instalar dependencias del frontend

Desde la carpeta `frontend/`:

```bash
cd ../frontend
npm install
```

Esto instalará: `react`, `react-dom`, `react-router-dom`, `@mui/material`, `@mui/icons-material`, `@emotion/react`, `@emotion/styled`, `axios`, `vite` (y sus devDependencies).

> Si deseas iniciar desde cero con `npm init`, ejecuta `npm init -y` en cada carpeta y luego agrega las dependencias listadas en los respectivos `package.json`.

### Paso 4: Configurar variables de entorno

**Backend:**
```bash
cd backend
cp .env.example .env
```

**Frontend:**
```bash
cd ../frontend
echo "VITE_API_URL=http://localhost:3000/api" > .env
```

---

## 7. Variables de entorno

### Backend (`backend/.env`)

| Variable | Valor por defecto | Descripción |
|----------|------------------|-------------|
| `NODE_ENV` | `development` | Entorno de ejecución |
| `PORT` | `3000` | Puerto del servidor Express |
| `DB_HOST` | `localhost` | Host de MySQL |
| `DB_PORT` | `3306` | Puerto de MySQL |
| `DB_USER` | `root` | Usuario de MySQL |
| `DB_PASSWORD` | `pass1234` | Contraseña de MySQL |
| `DB_NAME` | `autos_colombia` | Nombre de la base de datos |
| `TRUST_PROXY` | `0` | Número de proxies delante de la app |
| `CORS_ORIGIN` | `http://localhost:5173` | Origen permitido por CORS |
| `COOKIE_SECURE` | `false` | Cookie solo por HTTPS |

> ⚠️ **Importante:** No subas el archivo `.env` a control de versiones. Está incluido en `.gitignore`. Usa `.env.example` como plantilla.

### Frontend (`frontend/.env`)

| Variable | Valor por defecto | Descripción |
|----------|------------------|-------------|
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
- Todas las tablas: `usuarios`, `tipos_vehiculos`, `celdas`, `puertas`, `vehiculos`, `turnos`, `mensualidades`, `pagos`, `accesos_vehiculos`, `novedades`, `login_attempts`.
- Restricciones de integridad (claves foráneas, CHECK, UNIQUE).
- Índices únicos que previenen sobrecupo (`uq_acceso_vehiculo_dentro`, `uq_acceso_celda_ocupada`).

### 8.2 Sembrar datos iniciales

Desde `backend/`:

```bash
npm run seed           # Siembra solo si la base está vacía
npm run seed:reset     # Vacía todas las tablas y vuelve a sembrar
```

El seed crea:
- 2 tipos de vehículo: carro ($250.000 COP) y moto ($100.000 COP).
- 2 puertas, 80 celdas (70 carro A–G, 10 moto H).
- 1 operador: usuario `operador`, clave `123456`.
- 80 vehículos (CAR001–CAR070, MOT01A–MOT10A).
- Mensualidades de ejemplo (al día, en mora, sin mensualidad).

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

## 10. API REST y endpoints

La API expone los siguientes endpoints bajo el prefijo `/api`:

### 10.1 Resumen de endpoints

| Método | Endpoint | Descripción | Autenticación |
|--------|----------|-------------|---------------|
| `GET` | `/api/health` | Estado de la API | No |
| `GET` | `/api/vehiculos/:placa` | Consultar vehículo por placa | No |
| `GET` | `/api/celdas?tipo=carro\|moto` | Listar celdas disponibles | No |
| `POST` | `/api/movimientos/entrada` | Registrar ingreso de vehículo | No |
| `POST` | `/api/movimientos/salida` | Registrar salida de vehículo | No |

> La API es abierta (sin JWT). El operador y el turno se resuelven automáticamente en el backend usando el primer operador activo.

### 10.2 Health check

**`GET /api/health`**

Respuesta:
```json
{
  "status": "ok",
  "message": "API Auto Colombia funcionando"
}
```

### 10.3 Consultar vehículo por placa

**`GET /api/vehiculos/:placa`**

Parámetros de ruta:
- `placa` — Placa del vehículo (formato colombiano, se normaliza automáticamente).

Respuesta exitosa (200):
```json
{
  "id": 1,
  "placa": "CAR001",
  "estado": "Adentro",
  "mensualidad": 250000,
  "tipo": "Carro",
  "tipoCodigo": "carro",
  "modelo": 2022,
  "nombreModelo": "Sedan",
  "color": "Rojo",
  "usuario": "Carlos Perez",
  "estadoMensualidad": "Al día"
}
```

Códigos de error:
| Código | Motivo |
|--------|--------|
| 400 | Formato de placa inválido |
| 404 | Vehículo no encontrado |
| 500 | Error interno del servidor |

### 10.4 Consultar celdas disponibles

**`GET /api/celdas?tipo=carro\|moto`**

Parámetros de query:
- `tipo` (opcional): `carro` o `moto`. Si se omite, retorna todas las celdas disponibles.

Respuesta exitosa (200):
```json
[
  {
    "id_celda": 5,
    "codigo": "A5",
    "id_tipo_vehiculo": 1,
    "letra": "A",
    "numero": 5
  }
]
```

### 10.5 Registrar ingreso de vehículo

**`POST /api/movimientos/entrada`**

Cuerpo de la solicitud:
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
  "celda": "A5",
  "accion": "entrada",
  "fecha": "22/10/2026",
  "hora": "14:30"
}
```

Códigos de error:
| Código | Motivo |
|--------|--------|
| 400 | Placa y celda requeridos, placa inválida, vehículo no encontrado, celda ocupada, celda incompatible con el tipo |
| 404 | Vehículo no encontrado |
| 409 | El vehículo ya está adentro o la celda ya fue ocupado (duplicado) |
| 500 | No hay operador activo o error interno |

### 10.6 Registrar salida de vehículo

**`POST /api/movimientos/salida`**

Cuerpo de la solicitud:
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
  "celda": "A5",
  "accion": "salida",
  "fecha": "22/10/2026",
  "hora": "15:45"
}
```

Códigos de error:
| Código | Motivo |
|--------|--------|
| 400 | Placa requerida, placa inválida, el vehículo no está adentro |
| 404 | Vehículo no encontrado |
| 500 | Error interno del servidor |

---

## 11. Flujo de ingreso y salida

### 11.1 Ingreso de vehículo

1. El operador ingresa la placa del vehículo y selecciona una celda disponible.
2. El backend valida el formato de la placa.
3. Verifica que el vehículo exista en la base de datos.
4. Verifica que la celda exista, esté activa, no en mantenimiento y sea compatible con el tipo de vehículo.
5. Verifica que la celda esté libre (no exista un acceso abierto con `fecha_salida IS NULL`).
6. Resuelve el operador activo y su turno abierto (crea uno si no existe).
7. Registra el acceso en `accesos_vehiculos` dentro de una transacción.

### 11.2 Salida de vehículo

1. El operador ingresa la placa del vehículo.
2. El backend valida el formato de la placa y que el vehículo exista.
3. Busca el acceso abierto (sin `fecha_salida`) para ese vehículo.
4. Resuelve el operador y turno.
5. Cierra el acceso estableciendo `fecha_salida`, liberando la celda inmediatamente.

---

## 12. Reglas de negocio y restricciones

| Área | Regla |
|------|-------|
| **Placas** | Carro: `AAA###` | Moto: `AAA##X` (validación en backend y frontend) |
| **Celdas** | Una celda está ocupada si existe un acceso con `fecha_salida IS NULL` |
| **Sobrecupo** | Índices únicos `uq_acceso_vehiculo_dentro` y `uq_acceso_celda_ocupada` impiden duplicados incluso con peticiones simultáneas |
| **Mensualidades** | Estado derivado por fechas (`fecha_fin >= CURRENT_DATE()`): Al día / En mora / Sin mensualidad |
| **Cobro** | Solo por mensualidad. No existen tarifas por hora/día |
| **Operador/Turno** | Resueltos automáticamente en el backend (sin JWT por ahora) |
| **Puerta** | Se usa la puerta 1 por defecto (creada en el seed) |

---

## 13. Esquema de base de datos

### 13.1 Mapa de tablas

| Tabla | Descripción |
|-------|-------------|
| `usuarios` | Login de administrador y operador (solo staff, no clientes) |
| `tipos_vehiculos` | Moto y carro, con tarifa mensual fija |
| `celdas` | Spots físicos (letra-número) tipificados por tipo de vehículo |
| `puertas` | Entradas/salidas del parqueadero |
| `vehiculos` | Placa, propietario, celda fija, tipo |
| `turnos` | Caja por operador; uno abierto a la vez |
| `mensualidades` | Período contratado por vehículo |
| `pagos` | Pago de una mensualidad, dentro de un turno |
| `accesos_vehiculos` | Ingreso/salida del vehículo (bitácora) |
| `novedades` | Incidentes sobre un vehículo o acceso |
| `login_attempts` | Anti fuerza bruta para admin/operador |

### 13.2 Columnas calculadas (generated columns)

En `accesos_vehiculos`:
- `vehiculo_dentro` — `id_vehiculo` si `fecha_salida IS NULL`, de lo contrario `NULL`.
- `celda_ocupada` — `id_celda` si `fecha_salida IS NULL`, de lo contrario `NULL`.

Estas columnas tienen índices únicos que garantizan integridad concurrente.

---

## 14. Scripts disponibles

### Backend (`backend/package.json`)

| Script | Comando | Descripción |
|--------|---------|-------------|
| `dev` | `nodemon src/server.js` | Servidor de desarrollo con recarga automática |
| `start` | `node src/server.js` | Servidor en modo producción |
| `seed` | `node src/seed/seed.js` | Siembra datos iniciales si la base está vacía |
| `seed:reset` | `node src/seed/seed.js --reset` | Vacía todas las tablas y vuelve a sembrar |

### Frontend (`frontend/package.json`)

| Script | Comando | Descripción |
|--------|---------|-------------|
| `dev` | `vite` | Servidor de desarrollo con HMR |
| `build` | `vite build` | Build de producción |
| `lint` | `oxlint` | Análisis estático de código |
| `preview` | `vite preview` | Vista previa del build de producción |

---

## 15. Licencia

Este proyecto está bajo la **Licencia ISC**. Consulta el archivo `LICENSE` o el campo `license` en `backend/package.json` para más información.

> ⚠️ **Aviso:** Las contraseñas y credenciales de ejemplo en el seed (operador / 123456) son solo para entornos de desarrollo. Cambia estas credenciales antes de llevar el proyecto a producción.

---

## 16. Notas importantes

- **Sin ORM:** El backend utiliza `mysql2/promise` con consultas SQL parametrizadas nativas. No hay capa de mapeo objeto-relacional.
- **Sin JWT:** La API está abierta actualmente. Para producción se recomienda agregar autenticación basada en tokens (JWT) y middleware de autorización por roles.
- **Variables de entorno:** Nunca subas `.env` al repositorio. Usa `.env.example` como referencia.
- **Zona horaria:** El backend maneja fechas en zona `America/Bogota` para la presentación al usuario.
- **Base de datos primero:** Debes crear la base de datos con `Script/parqueadero.sql` antes de ejecutar `npm run seed` o iniciar el servidor.

---

<div align="center">

**Auto Colombia — Sistema de Parqueadero Vehicular**  
Desarrollado con ❤️ en Node.js, Express, MySQL, React y Vite

[🔝 Volver al inicio](#-auto-colombia---sistema-de-parqueadero-vehicular)

</div>

