# Auto Colombia — Sistema de Parqueadero Vehicular

Sistema de gestión de ingresos y salidas de parqueadero con backend en **Node.js + Express + MySQL** (sin ORM) y frontend en **React + Vite + Material UI**.

Permite registrar el ingreso y salida de vehículos (carros y motos) en un parqueadero con celdas numeradas, validación de placas, control de mensualidades y asignación de celdas por tipo de vehículo.

---

## Tabla de contenidos

1. [Descripción del proyecto](#1-descripción-del-proyecto)
2. [Stack tecnológico](#2-stack-tecnológico)
3. [Requisitos previos](#3-requisitos-previos)
4. [Estructura del proyecto](#4-estructura-del-proyecto)
5. [Instalación paso a paso](#5-instalación-paso-a-paso)
6. [Variables de entorno](#6-variables-de-entorno)
7. [Base de datos](#7-base-de-datos)
8. [Ejecución del proyecto](#8-ejecución-del-proyecto)
9. [Arquitectura del backend](#9-arquitectura-del-backend)
10. [API REST y endpoints](#10-api-rest-y-endpoints)
11. [Flujo de ingreso y salida](#11-flujo-de-ingreso-y-salida)
12. [Restricciones y reglas de negocio](#12-restricciones-y-reglas-de-negocio)
13. [Capacidad del parqueadero](#13-capacidad-del-parqueadero)
14. [Scripts auxiliares](#14-scripts-auxiliares)
15. [Notas importantes](#15-notas-importantes)

---

## 1. Descripción del proyecto

Auto Colombia es un sistema de control de parqueadero que gestiona:

- **Ingreso y salida de vehículos** (carros y motos) con asignación de celda.
- **Validación de placas** según formato colombiano (carro: `AAA###`, moto: `AAA##X`).
- **Control de mensualidades**: al día, en mora o sin mensualidad.
- **Consulta de estado** del vehículo (adentro/fuera, modelo, año, color, propietario).
- **Backend abierto**: actualmente no requiere autenticación JWT; el operador y turno se resuelven en el backend.

## 2. Stack tecnológico

| Capa | Tecnología | Versión |
|------|------------|---------|
| Backend runtime | Node.js | 18+ |
| Backend framework | Express | ^5.3.0 |
| Base de datos | MySQL | 8.0+ |
| Driver MySQL | mysql2 | ^3.11.0 |
| Hash de contraseñas | bcryptjs | ^2.4.3 |
| CORS | cors | ^2.8.6 |
| Frontend framework | React | ^19.3.1 |
| Build tool | Vite | ^8.3.4 |
| Routing | React Router | ^7.18.4 |

## 4. Estructura del proyecto

El proyecto está organizado en dos carpetas independientes en la raíz:

```
Auto_Colombia/
├── .gitignore
├── README.md
├── backend/
│   ├── .env
│   ├── .env.example
│   ├── package.json
│   ├── Script/
│   │   └── parqueadero.sql        # Esquema SQL de la base de datos
│   └── src/
│       ├── app.js                 # Configuración Express y montaje de rutas
│       ├── server.js              # Punto de entrada: conecta DB y levanta servidor
│       ├── config/
│       │   ├── db.js              # Pool de conexiones MySQL
│       │   └── envLoader.js       # Carga .env antes de importar config
│       ├── controllers/
│       │   ├── vehiculoController.js
│       │   ├── movimientoController.js
│       │   ├── celdaController.js
│       │   ├── authController.js
│       │   └── turnoController.js
│       ├── middleware/
│       │   └── authMiddleware.js
│       ├── routes/
│       │   ├── index.js
│       │   ├── vehiculos.js
│       │   ├── celdas.js
│       │   ├── movimientos.js
│       │   ├── auth.js
│       │   ├── turnos.js
│       │   └── movimientoRoutes.js
│       ├── seed/
│       │   ├── seed.js              # Siembra de datos iniciales (--reset)
│       │   └── catalogoVehiculos.js # Catálogo de modelos, años y colores
│       └── validators/
│           └── placa.js           # Validación y normalización de placas
└── frontend/
    ├── .env
    ├── index.html
    ├── package.json
    ├── vite.config.js
    └── src/
        ├── main.jsx
        ├── App.jsx
        ├── App.css
        ├── api.js                 # Capa de comunicación con el backend
        ├── validators/
        │   └── placa.js           # Validación de placas en frontend
        ├── Components/
        │   ├── layout/
        │   │   ├── Sidebar.jsx
        │   │   ├── Navbar.jsx
        │   │   ├── SidebarData.jsx
        │   │   ├── Sidebar.css
        │   │   └── Navbar.css
        │   └── ingreso-salida/
        │       ├── FormularioIngreso.jsx
        │       ├── FormularioSalida.jsx
        │       ├── PanelMovimiento.jsx
        │       ├── PanelVehiculo.jsx
        │       └── AlertaPlaca.jsx
        └── pages/

## 5. Instalación paso a paso

### 5.1 Backend

Desde la carpeta `backend/`. Si no existe `package.json`, se crea con `npm init -y` y se agrega `"type": "module"`.

```bash
cd backend

# 1. Inicializar proyecto (si no hay package.json)
npm init -y

# 2. Instalar dependencias de producción
npm install express mysql2 cors bcryptjs

# 3. Instalar dependencia de desarrollo
npm install --save-dev nodemon
```

**Dependencias finales (`backend/package.json`):**

```json
{
  "dependencies": {
    "bcryptjs": "^2.4.3",
    "cors": "^2.8.6",
    "express": "^5.3.0",
    "mysql2": "^3.11.0"
  },
  "devDependencies": {
    "nodemon": "^3.1.14"
  }
}
```

**Scripts disponibles:**

| Script | Comando | Descripción |
|--------|---------|-------------|
| `npm run dev` | `nodemon src/server.js` | Servidor en modo desarrollo con recarga automática |
| `npm run seed` | `node src/seed/seed.js` | Siembra datos iniciales (no destructivo) |
| `npm run seed:reset` | `node src/seed/seed.js --reset` | Vacía tablas y vuelve a sembrar desde cero |

### 5.2 Frontend


## 6. Variables de entorno

### Backend (`backend/.env`)

Crear basado en `backend/.env.example`:

```env
PORT=3000
NODE_ENV=development
DB_HOST=localhost
DB_PORT=3306
DB_USER=tu_usuario_mysql
DB_PASSWORD=tu_contraseña
DB_NAME=autos_colombia
CORS_ORIGIN=http://localhost:5173
COOKIE_SECURE=false
TRUST_PROXY=0
```


## 7. Base de datos

### 7.1 Crear la base de datos

```bash
mysql -u tu_usuario -p
CREATE DATABASE autos_colombia CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE autos_colombia;
```

### 7.2 Ejecutar el esquema SQL

Desde `backend/Script/`:

```bash
mysql -u tu_usuario -p autos_colombia < parqueadero.sql
```

El esquema crea: `tipos_vehiculos`, `celdas`, `vehiculos`, `mensualidades`, `accesos_vehiculos`, `usuarios`, `turnos`, `puertas`, entre otras tablas con sus claves foráneas.

## 8. Ejecución del proyecto

### 8.1 Backend

```bash
cd backend
npm run dev
# Servidor en http://localhost:3000
```

### 8.2 Frontend

```bash
cd frontend
npm run dev
# Aplicación en http://localhost:5173
```

## 9. Arquitectura del backend

### 9.1 Capas

- **Configuración:** `config/envLoader.js` carga el `.env`; `config/db.js` crea el pool MySQL; `config/catalogoVehiculos.js` define modelos, colores y años.
- **Rutas:** `routes/*.js` definen los endpoints y delegan en los controladores.
- **Controladores:** contienen la lógica de negocio y las consultas SQL parametrizadas.
- **Middleware:** `authMiddleware.js` disponible para futuras protecciones JWT (actualmente sin uso en rutas montadas).
- **Validadores:** `validators/placa.js` normaliza y valida placas (mayúsculas, sin guiones, formato carro/moto).
- **Seed:** `seed.js` siembra datos iniciales de forma idempotente.


## 10. API REST y endpoints

La API está montada en `backend/src/app.js`. Actualmente expone endpoints públicos (sin JWT):

### 10.1 Vehículos

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `GET` | `/api/vehiculos/:placa` | Consulta un vehículo por placa (normalizada: mayúsculas, sin guiones). |

**Respuesta exitosa (200):**

```json
{
  "id": 1,
  "placa": "CAR001",
  "estado": "Fuera",
  "mensualidad": "250000.00",
  "tipo": "Carro",
  "tipoCodigo": "carro"
}
```

### 10.2 Celdas

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `GET` | `/api/celdas?tipo=carro\|moto` | Obtiene celdas disponibles por tipo de vehículo. |

### 10.3 Movimientos

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `POST` | `/api/movimientos/entrada` | Registra el ingreso de un vehículo (`{ placa, id_celda }`). |

## 11. Flujo de ingreso y salida

**Ingreso:**

1. El operador ingresa la placa del vehículo.
2. El backend consulta si el vehículo existe en la base de datos.
3. Valida que el vehículo tenga una mensualidad vigente y no esté en mora.
4. Verifica que el vehículo no esté ya dentro (acceso abierto sin fecha de salida).
5. Selecciona una celda disponible del tipo correspondiente (carro o moto).
6. Registra el acceso con fecha de entrada y asigna la celda.

**Salida:**

## 12. Restricciones y reglas de negocio

### Validación de placas

- **Carro:** `AAA###` (ej. `CAR001`, `CAR-001`)
- **Moto:** `AAA##X` (ej. `MOT01A`, `MOT-01A`)
- **Normalización:** mayúsculas, sin espacios ni guiones.

### Restricciones de ingreso

| Caso | Código HTTP | Motivo |
|------|-------------|--------|
| Placa inválida | 400 | Formato incorrecto |
| Vehículo inexistente | 404 | No está en la BD |
| Ya está dentro | 400 | Acceso abierto existente |
| Sin mensualidad | 403 | No tiene mensualidad asignada |
| Mensualidad en mora | 403 | Fecha de vencimiento pasada |
| Celda inexistente / ocupada | 400 | No disponible |
| Tipo de vehículo incorrecto | 400 | Moto en celda de carro o viceversa |

## 13. Capacidad del parqueadero

| Concepto | Cantidad |
|----------|----------|
| Total de celdas | 80 |
| Celdas de carro | 70 (bloques A–G) |
| Celdas de moto | 10 (bloque H) |
| Tarifa mensualidad carro | $250.000 COP |

## 14. Scripts auxiliares (`backend/Script/`)

| Archivo | Propósito |
|---------|-----------|
| `parqueadero.sql` | Esquema completo de MySQL |

**Scripts backend (npm):**


## 15. Notas importantes

- Las placas se normalizan en frontend y backend para que `CAR-001`, `car001` y `CAR001` consulten el mismo vehículo.
- `vehiculos.modelo` guarda el año de lanzamiento (4 dígitos); `nombre_modelo` guarda el nombre comercial.
- No hay autenticación JWT: el operador y el turno se resuelven automáticamente en el backend.
- Los archivos `.env`, `node_modules/` y logs no se versionan (ver `.gitignore`).
- Los índices únicos `uq_acceso_vehiculo_dentro` y `uq_acceso_celda_ocupada` impiden duplicados incluso con peticiones simultáneas.
- Las celdas disponibles se calculan dinámicamente: una celda está ocupada si existe un acceso con `fecha_salida IS NULL`.
| Script | Comando | Propósito |
|--------|---------|-----------|
| `npm run seed` | `node src/seed/seed.js` | Siembra datos iniciales si la base está vacía |
| `npm run seed:reset` | `node src/seed/seed.js --reset` | Vacía todas las tablas y vuelve a sembrar |
| Tarifa mensualidad moto | $100.000 COP |

No se permite sobrecupo: una celda está ocupada si existe un acceso con `fecha_salida IS NULL`.

### Restricciones de salida

| Caso | Código HTTP | Motivo |
|------|-------------|--------|
| Vehículo no está adentro | 400 | No hay acceso abierto para esa placa |
| Placa no encontrada | 404 | El vehículo no existe en la BD |

1. El operador ingresa la placa del vehículo.
2. El backend verifica que el vehículo exista y esté actualmente adentro.
3. Cierra el acceso estableciendo la fecha de salida.
4. Libera la celda asignada para que quede disponible.
| `POST` | `/api/movimientos/salida` | Registra la salida de un vehículo (`{ placa }`). |

### 10.4 Health check

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `GET` | `/api/health` | Estado de la API. |

**Respuesta esperada:**

```json
{ "status": "ok", "message": "API Auto Colombia funcionando" }
```

> La API es abierta (sin JWT). El operador y el turno se resuelven en el backend.
### 9.2 Flujo de petición

```
Cliente (React) ──HTTP──► Express (app.js) ──► Controlador ──► Consulta SQL (mysql2) ──► MySQL
```

### 8.3 Verificar funcionamiento

```bash
curl http://localhost:3000/api/health
# Respuesta esperada: { "status": "ok", "message": "API Auto Colombia funcionando" }
```

### 7.3 Sembrar datos iniciales

```bash
cd backend
npm run seed               # Siembra sin borrar existentes
npm run seed:reset         # Vacía tablas y vuelve a sembrar desde cero
```

El seed crea 80 vehículos (CAR001–CAR070 y MOT01A–MOT10A), 80 celdas, 5 usuarios y 15 mensualidades.
### Frontend (`frontend/.env`)

```env
VITE_API_URL=http://localhost:3000/api
```

> El frontend lee `VITE_API_URL` desde `frontend/src/api.js`. Por defecto apunta a `http://localhost:3000/api`.
Desde la carpeta `frontend/`:

```bash
cd frontend
npm install
```

**Dependencias principales:** `react`, `react-dom`, `react-router-dom`, `axios`, `@mui/material`, `@mui/icons-material`, `vite`.

**Scripts disponibles:**

| Script | Comando | Descripción |
|--------|---------|-------------|
| `npm run dev` | `vite` | Servidor de desarrollo con HMR |
| `npm run build` | `vite build` | Build de producción |
| `npm run preview` | `vite preview` | Vista previa del build |
| `npm run lint` | `oxlint` | Análisis estático de código |
            ├── IngresoSalida.jsx
            └── VistasVacia.jsx
```
| HTTP client | Axios / fetch | ^1.20.0 |
| UI Components | Material UI | ^9.5.0 |
| Estilos | Emotion / MUI | ^11.x |
| Linter | oxlint | ^1.88.0 |

## 3. Requisitos previos

| Herramienta | Versión recomendada | Propósito |
|-------------|---------------------|-----------|
| Node.js | 18 o superior | Entorno de ejecución |
| npm | 9 o superior | Gestor de paquetes |
| MySQL Server | 8.0+ | Motor de base de datos |
| MySQL Workbench (opcional) | — | Administración visual de BD |