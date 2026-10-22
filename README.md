# Auto Colombia — Sistema de Parqueadero Vehicular

Sistema de gestión de ingresos y salidas de parqueadero con backend en **Node.js + Express + MySQL** (sin ORM) y frontend en **React + Vite + Material UI**.

---

## 1. Descripción del proyecto

Permite registrar el ingreso y salida de vehículos (carros y motos) en un parqueadero con celdas numeradas. Incluye validación de placas, control de mensualidades (al día / en mora / sin mensualidad), asignación de celdas por tipo de vehículo y consulta de estado de vehículos.

- **Backend:** API REST en Express, MySQL nativo (`mysql2`), autenticación con `bcryptjs`, CORS habilitado.
- **Frontend:** React 19, Vite, Material UI (MUI), React Router, Axios.
- **Base de datos:** MySQL, esquema definido en `backend/Script/parqueadero.sql`.

---

## 2. Requisitos previos

Antes de comenzar, asegúrate de tener instalado:

| Herramienta | Versión recomendada | Propósito |
|-------------|---------------------|-----------|
| Node.js | 18 o superior | Entiempo de ejecución |
| npm | 9 o superior | Gestor de paquetes |
| MySQL Server | 8.0+ | Motor de base de datos |
| MySQL Workbench (opcional) | — | Administración visual de BD |

---

## 3. Instalación paso a paso

### 3.1 Clonar o preparar el proyecto

```bash
# Si tienes el repositorio, entra a la carpeta raíz
cd C:\Users\Lenovo\Documents\Auto_Colombia
```

El proyecto está dividido en dos carpetas independientes:

```
Auto_Colombia/
├── backend/   # API REST Node.js + Express
└── frontend/  # SPA React + Vite
```

---

### 3.2 Backend — desde `npm init` hasta dependencias

El backend ya cuenta con su `package.json`, pero si quisieras reconstruirlo desde cero, los pasos son:

```bash
cd backend

# 1. Inicializar proyecto Node (si no existiera package.json)
npm init -y

# 2. Configurar como módulos ES (agregar en package.json manualmente)
# "type": "module"

# 3. Instalar dependencias de producción
npm install express mysql2 cors bcryptjs

# 4. Instalar dependencia de desarrollo
npm install --save-dev nodemon

# 5. Instalar todo de una vez (equivalente a lo que ya está configurado)
npm install express mysql2 cors bcryptjs
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
| `npm run dev` | `nodemon src/server.js` | Inicia el servidor en modo desarrollo con recarga automática |
| `npm run seed` | `node src/seed.js` | Siembra datos iniciales (no destructivo) |
| `npm run seed -- --reset` | `node src/seed.js --reset` | Vacía tablas y vuelve a sembrar desde cero |

### 3.3 Frontend — instalación de dependencias

```bash
cd frontend

# Instalar todas las dependencias definidas en package.json
npm install
```

**Dependencias principales (`frontend/package.json`):**

| Dependencia | Versión | Uso |
|-------------|---------|-----|
| react | ^19.3.1 | Framework de interfaz |
| react-dom | ^19.3.1 | Renderizado en DOM |
| react-router-dom | ^7.18.4 | Navegación entre vistas |
| axios | ^1.20.0 | Cliente HTTP para llamar al backend |
| @mui/material | ^9.5.0 | Componentes de interfaz (Material UI) |
| @mui/icons-material | ^9.5.0 | Iconografía |
| @emotion/react / styled | ^11.x | Estilos en MUI |
| vite | ^8.3.4 | Bundler y servidor de desarrollo |

**Scripts disponibles:**

| Script | Comando | Descripción |
|--------|---------|-------------|
| `npm run dev` | `vite` | Servidor de desarrollo con HMR |
| `npm run build` | `vite build` | Build de producción |
| `npm run preview` | `vite preview` | Vista previa del build |

---

## 4. Variables de entorno

### Backend (`backend/.env`)

Crea este archivo basado en `backend/.env.example`:

```env
PORT=3000
NODE_ENV=development
DB_HOST=localhost
DB_USER=tu_usuario_mysql
DB_PASSWORD=tu_contraseña
DB_NAME=autos_colombia
```

### Frontend (`frontend/.env`)

```env
VITE_API_URL=http://localhost:3000/api
```

> **Nota:** El frontend consume la API mediante `frontend/src/api.js`, que lee `VITE_API_URL` y por defecto apunta a `http://localhost:3000/api`.

---

## 5. Base de datos

### 5.1 Crear la base de datos

```bash
# Entrar a MySQL
mysql -u tu_usuario -p

## 7. Arquitectura

### 7.1 Estructura de carpetas

```
Auto_Colombia/
├── backend/
│   ├── .env
│   ├── .env.example
│   ├── package.json
│   ├── Script/
│   │   ├── parqueadero.sql       # Esquema SQL de la base de datos
│   │   ├── migrarVehiculos.mjs   # Migración: modelo -> año + nombre_modelo
│   │   ├── pruebas.mjs           # Suite de pruebas end-to-end
│   │   ├── verificar.mjs         # Script de verificación de datos en BD
│   │   └── contexto.mjs          # Script de contexto/verificación
│   └── src/
│       ├── app.js                # Configuración Express y rutas
│       ├── server.js             # Punto de entrada, conexión DB y escucha
│       ├── config/
│       │   ├── db.js             # Pool de conexiones MySQL
│       │   ├── env.js            # Carga y validación de variables de entorno
│       │   ├── envLoader.js      # Carga .env antes de importar config
│       │   └── catalogoVehiculos.js # Catálogo de modelos, años y colores
│       ├── controllers/
│       │   ├── vehiculoController.js
│       │   ├── movimientoController.js
│       │   ├── celdaController.js
│       │   ├── turnoController.js
│       │   └── authController.js
│       ├── middleware/
│       │   └── authMiddleware.js
│       ├── routes/
│       │   ├── index.js
│       │   ├── vehiculos.js
│       │   ├── celdas.js
│       │   ├── movimientos.js
│       │   ├── movimientoRoutes.js
│       │   ├── auth.js
│       │   └── turnos.js
│       ├── validators/
│       │   └── placa.js          # Validación y normalización de placas
│       └── seed.js               # Siembra de datos iniciales
├── frontend/
│   ├── .env
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   └── src/
│       ├── main.jsx
│       ├── App.jsx
│       ├── App.css
│       ├── api.js                # Capa de comunicación con el backend
│       ├── validators/
│       │   └── placa.js          # Validación de placas en frontend
│       └── Components/
│           ├── FormulariosConsulta.jsx   # Formulario ingreso/salida
│           ├── Navbar.jsx
│           ├── Sidebar.jsx
│           ├── SidebarData.jsx
│           ├── VistaVacia.jsx
│           ├── FormulariosConsulta.css
│           └── Navbar.css
```

### 7.2 Flujo de petición

```
Cliente (React) ──HTTP──► Express (app.js) ──► Controlador ──► Consulta SQL (mysql2) ──► MySQL
```

---

## 8. API REST y endpoints

La API está montada en `backend/src/app.js`. Actualmente expone los siguientes endpoints públicos (sin JWT por ahora):

### 8.1 Vehículos

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `GET` | `/api/vehiculos/:placa` | Consulta un vehículo por placa. La placa se normaliza (mayúsculas, sin guiones ni espacios). |

**Respuesta exitosa (200):**

```json
{
  "id": 1,
  "placa": "CAR001",
  "estado": "Fuera",
  "mensualidad": "250000.00",
  "tipo": "Carro",
  "tipoCodigo": "carro",
  "modelo": "2016",
  "nombreModelo": "Toyota Hilux",
  "color": "Blanco",
  "usuario": "Carlos Perez",
  "estadoMensualidad": "Al día"
}
```

| Código | Significado |
|--------|-------------|
| 200 | Vehículo encontrado |
| 400 | Formato de placa inválido |
| 404 | Vehículo no existe |


## 9. Flujo de ingreso y salida

### 9.1 Ingreso de vehículo (entrada)

Desde el panel izquierdo del frontend (`FormulariosConsulta.jsx`):

1. El operador escribe la placa del vehículo.
2. El frontend normaliza la placa (`placa.js`: mayúsculas, elimina espacios y guiones).
3. Se consulta `GET /api/vehiculos/:placa`.
4. Si el vehículo existe y está **fuera**, se muestra su información (modelo, año, color, mensualidad, estado).
5. El operador selecciona una celda disponible de `GET /api/celdas?tipo=carro|moto`.
6. Al presionar **Ingresar**, se envía `POST /api/movimientos/entrada` con `{ placa, id_celda }`.

### 9.2 Salida de vehículo

Desde el panel derecho del frontend:

1. El operador escribe la placa.
2. Se consulta el vehículo y se verifica que esté **dentro** (acceso abierto en `accesos_vehiculos`).
3. Al presionar **Salir**, se envía `POST /api/movimientos/salida` con `{ placa }`.

---

## 10. Restricciones y reglas de negocio

### 10.1 Restricciones de ingreso

| Restricción | Código HTTP | Descripción |
|-------------|-------------|-------------|
| Placa inválida | 400 | La placa no cumple el formato `AAA###` (carro) o `AAA##X` (moto) |
| Vehículo inexistente | 404 | La placa no está registrada en la BD |
| Vehículo ya dentro | 400 | Ya hay un acceso abierto para esa placa |
| Mensualidad vencida (mora) | 403 | El vehículo tiene mensualidad en mora |
| Sin mensualidad | 403 | El vehículo no tiene mensualidad asignada |
| Celda inexistente | 400 | La celda seleccionada no existe |
| Celda ocupada | 400 | La celda ya tiene otro vehículo asignado |
| Tipo de vehículo incorrecto | 400 | Una moto no puede entrar en celda de carro y viceversa |

### 10.2 Restricciones de salida

| Restricción | Código HTTP | Descripción |
|-------------|-------------|-------------|
| Vehículo no está dentro | 400 | No hay acceso abierto para esa placa |
| Placa inválida | 400 | Formato incorrecto |

### 10.3 Validación de placas

`src/validators/placa.js` (backend y frontend comparten lógica similar):

- **Carro:** 3 letras + 3 dígitos (ej. `ABC123`, `CAR001`, `CAR-001`)
- **Moto:** 3 letras + 2 dígitos + 1 letra (ej. `XYZ12A`, `MOT01A`, `MOT-01A`)
- Normalización: mayúsculas, sin espacios, sin guiones.

---

## 11. Capacidad del parqueadero

| Concepto | Cantidad | Detalle |
|----------|----------|---------|
| Total de celdas | 80 | 70 para carros + 10 para motos |
| Celdas de carro | 70 | Bloques A a G |
| Celdas de moto | 10 | Bloque H |
| Vehículos sembrados | 80 | CAR001–CAR070 + MOT01A–MOT10A |
| Tarifa mensualidad carro | $250.000 COP | Por tipo de vehículo |

## 14. Tecnologías

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
| HTTP client | Axios | ^1.20.0 |
| UI Components | Material UI | ^9.5.0 |
| Estilos | Emotion / MUI | ^11.x |

---

## 15. Notas adicionales

- La API actual **no requiere autenticación JWT** (`app.js` indica que la API es abierta y el operador/turno se resuelve en el backend).
- Las placas se normalizan tanto en frontend como backend para que `CAR-001`, `car001` y `CAR001` consulten el mismo vehículo.
- Los logs del servidor se escriben en `server_out.log` y `server_err.log` cuando se inicia con `Start-Process` en Windows.
- Para resetear completamente el entorno de pruebas: `npm run seed -- --reset` y reiniciar el backend.

---

## 16. Licencia

ISC (ver `backend/package.json`).
| Tarifa mensualidad moto | $100.000 COP | Por tipo de vehículo |

> La capacidad máxima simultánea es de **80 vehículos** (ocupando todas las celdas). No se permite sobrecupo.

---

## 12. Catálogo de vehículos

El módulo `src/config/catalogoVehiculos.js` define:

- `MODELOS_POR_TIPO`: nombres comerciales disponibles para carros y motos.
- `COLORES`: lista de colores de carrocería.
- `anioDeModelo(nombre)`: devuelve el año de lanzamiento de cada modelo (4 dígitos).
- `numeroDePlaca(i)`: genera placas secuenciales (CAR001…CAR070, MOT01A…MOT10A).

Durante la migración (`Script/migrarVehiculos.mjs`), la columna `modelo` se convierte de nombre comercial a año de lanzamiento, y se crea `nombre_modelo` con el nombre comercial.

---

## 13. Scripts auxiliares (backend/Script/)

| Archivo | Propósito |
|---------|-----------|
| `parqueadero.sql` | Esquema completo de la base de datos MySQL |
| `migrarVehiculos.mjs` | Migra `modelo` de nombre comercial a año y agrega `nombre_modelo` |
| `pruebas.mjs` | Suite de pruebas end-to-end contra la API (37 casos) |
| `verificar.mjs` | Verifica conteos, esquemas, mensualidades y duplicados en BD |
| `contexto.mjs` | Verificación de entorno y conexión |
### 8.2 Celdas

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `GET` | `/api/celdas?tipo=carro\|moto` | Lista celdas disponibles, opcionalmente filtradas por tipo. |

### 8.3 Movimientos (ingreso y salida)

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `POST` | `/api/movimientos/entrada` | Registra el ingreso de un vehículo. Body: `{ placa, id_celda }` |
| `POST` | `/api/movimientos/salida` | Registra la salida de un vehículo. Body: `{ placa }` |

### 8.4 Salud del sistema

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `GET` | `/api/health` | Verifica que la API esté en funcionamiento. |

> Los archivos de ruta `auth.js`, `turnos.js`, `movimientoRoutes.js`, `celdaController.js` y `turnoController.js` existen en el código, pero en `app.js` solo están montadas las rutas de `vehiculos`, `celdas` y `movimientos`. Los demás módulos están disponibles para futura activación.

# Crear la base de datos
CREATE DATABASE autos_colombia CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE autos_colombia;
```

### 5.2 Ejecutar el esquema SQL

Desde la carpeta `backend/Script/`:

```bash
mysql -u tu_usuario -p autos_colombia < parqueadero.sql
```

Este script crea:

- `tipos_vehiculos` (carro, moto)
- `celdas` (80 celdas: 70 carro + 10 moto)
- `vehiculos` (80 vehículos con placa, modelo/año, nombre comercial, color, propietario, celda fija)
- `mensualidades` (estados: activa, vencida)
- `accesos_vehiculos` (historial de ingresos/salidas)
- `usuarios`, `turnos`, `puertas`, etc.

### 5.3 Sembrar datos iniciales

```bash
cd backend
npm run seed          # Siembra sin borrar existentes
npm run seed -- --reset  # Borra todo y vuelve a sembrar desde cero
```

El seed crea:

- 2 tipos de vehículo (carro $250.000, moto $100.000)
- 80 celdas (bloques A-G para carros, H para motos)
- 5 usuarios (admin, operador, lucia activos; carlos, marta inactivos)
- 80 vehículos (CAR001–CAR070, MOT01A–MOT10A)
- 15 mensualidades (13 vigentes, 2 vencidas)

---

## 6. Ejecución del proyecto

### 6.1 Backend

```bash
cd backend
npm run dev
# Servidor en http://localhost:3000
```

### 6.2 Frontend

```bash
cd frontend
npm run dev
# Aplicación en http://localhost:5173 (por defecto de Vite)
```

### 6.3 Verificar que todo funciona

```bash
# Health check del backend
curl http://localhost:3000/api/health
# Respuesta esperada: { "status": "ok", "message": "API Auto Colombia funcionando" }
```