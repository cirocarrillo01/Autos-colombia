# Parches SQL — Auto Colombia

Este documento registra los cambios aplicados a `backend/Script/parqueadero.sql` y las migraciones incrementales no incluidas en el esquema base.

---

## 1. Parches aplicados a `backend/Script/parqueadero.sql`

### 1.1. Eliminación de depuración final (antes líneas 318-321)

Se eliminaron las líneas de depuración que se ejecutaban al importar el script:

```sql
USE autos_colombia;

SELECT *
FROM vehiculos;
```

**Impacto:** Ninguno en el esquema ni en los datos. Solo se evita salida innecesaria en la consola del cliente MySQL al crear la base.

---

### 1.2. Actualización de comentarios obsoletos ("celda fija")

El modelo de negocio es de **celdas rotativas** (cada ingreso elige una celda libre del mismo tipo), no celdas fijas asignadas por vehículo. Se corrigieron los comentarios:

| Línea antes | Contenido anterior | Contenido nuevo |
|-------------|-------------------|-----------------|
| 8 | `Cada vehículo mensual tiene una celda fija asignada.` | `Cada ingreso elige una celda libre rotativa del mismo tipo del vehículo.` |
| 21 | `vehiculos: placa + propietario + celda_fija + tipo` | `vehiculos: placa + propietario + tipo` |
| 214 | `id_celda ... -- toma de vehiculos.id_celda_fija al ingresar` | `id_celda ... -- celda asignada en el ingreso (rotativa)` |

**Nota:** La tabla `vehiculos` nunca tuvo columna `celda_fija`; el comentario anterior era factualmente incorrecto.

---

### 1.3. Índices adicionales

Se agregaron dos índices con `IF NOT EXISTS` (idempotentes):

```sql
CREATE INDEX IF NOT EXISTS ix_acceso_fecha_ingreso ON accesos_vehiculos (fecha_ingreso);
CREATE INDEX IF NOT EXISTS ix_la_fecha ON login_attempts (fecha_intento);
```

- `ix_acceso_fecha_ingreso`: mejora consultas de historial filtradas solo por rango de fechas.
- `ix_la_fecha`: mejora purgas masivas de `login_attempts` por antigüedad.

---

### 1.4. Evento programado de purga (comentado por seguridad)

Se agregó como SQL **comentado** un evento programado para purgar `login_attempts` y `audit_log` antiguos (más de 90 días):

```sql
-- CREATE EVENT IF NOT EXISTS ev_purga_login_attempts
-- ON SCHEDULE EVERY 24 HOUR
-- DO
--   DELETE FROM login_attempts WHERE fecha_intento < DATE_SUB(UTC_TIMESTAMP(), INTERVAL 90 DAY);
```

**No está activado por defecto** porque:
- Borra datos irreversiblemente.
- Requiere `event_scheduler = ON` en el servidor MySQL.
- La política de retención debe definirse con el negocio y validarse en staging antes de activarse.

---

### 1.5. `refresh_tokens.token` guarda SHA-256

La columna `refresh_tokens.token` ya es `VARCHAR(128)`, suficiente para almacenar un hash SHA-256 hex (64 caracteres). El código backend (`refreshTokenRepository.js`) ya guarda `hashToken(token)` en lugar del token en claro.

**Impacto operativo:** Los refresh tokens existentes en la base de datos (guardados en claro antes de este cambio) dejarán de validar. Los usuarios deberán volver a iniciar sesión una vez tras el despliegue.

---

## 2. Migraciones incrementales (`backend/migrations/`)

| Archivo | Descripción |
|---------|-------------|
| `001_initial_schema.sql` | Esquema inicial (tablas base). |
| `002_add_sesion_activa.sql` | Agrega `sesion_activa` y `fecha_sesion_activa` a `usuarios`, más índice `ix_usuario_sesion_activa`. |
| `003_add_mantenimiento_hasta.sql` | Agrega `mantenimiento_hasta` a `celdas`. |
| `004_create_audit_log.sql` | Crea tabla `audit_log`. |
| `005_create_revoked_tokens.sql` | Crea tabla `revoked_tokens` (JTI revocados). |
| `006_create_refresh_tokens.sql` | Crea tabla `refresh_tokens`. |
| `007_audit_log_accion.sql` | Modifica `audit_log.accion` de `VARCHAR(60)` a `VARCHAR(50) NOT NULL` para codificar rechazos (`entrada_rechazada`, `salida_rechazada`, etc.). |

---

## 3. Archivo suelto: `backend/Script/migracion_sesion_activa.sql`

Existe un archivo duplicado de la migración 002 en `backend/Script/migracion_sesion_activa.sql`. Contiene el mismo `ALTER TABLE` que `backend/migrations/002_add_sesion_activa.sql` más un `SELECT` de confirmación. No está versionado como migración incremental; se mantiene como referencia para bases creadas con `parqueadero.sql` antes de que las columnas existieran.

**Recomendación:** Usar `backend/migrations/002_add_sesion_activa.sql` como fuente de verdad. El archivo en `backend/Script/` puede eliminarse una vez confirmado que no se referencia en ningún proceso de despliegue.

---

## 4. Cómo aplicar las migraciones

Desde `backend/`:

```bash
# Verificar migraciones pendientes (según el entorno)
mysql -u root -p autos_colombia < backend/migrations/007_audit_log_accion.sql
```

Siempre tomar un backup (`mysqldump`) antes de aplicar cualquier migración en producción.
