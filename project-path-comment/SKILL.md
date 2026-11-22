# Project Path Comment

Skill que garantiza que los archivos de código fuente de la aplicación mantengan en su primera línea (línea 1) la ruta relativa completa desde la raíz real del proyecto hasta el nombre del archivo y su formato, facilitando el mapeo y orientación del código.

## Cuándo aplicarla

- Al crear archivos nuevos dentro de la lógica de la aplicación (componentes, vistas, hooks, utilidades, servicios, rutas, controladores, modelos o middlewares).
- Al modificar o refactorizar archivos de código fuente existentes.

## Cuándo NO aplicarla

- En archivos de configuración del proyecto o herramientas (`package.json`, `.env`, `.gitignore`, `vite.config.*`, `tailwind.config.*`, `tsconfig.json`, etc.).
- En archivos de datos estáticos JSON o documentación general del repositorio (`README.md`).

## Reglas de ejecución

1. **Identificación de la ruta real:** Analiza la estructura de carpetas del proyecto en curso para determinar todas las carpetas desde la raíz hasta el archivo destino. No uses rutas genéricas ni asumas nombres de carpetas si el proyecto usa una estructura propia.
2. **Formato en Línea 1:** Coloca el comentario estrictamente en la **línea 1** del archivo (sin líneas en blanco ni `import` antes), siguiendo la sintaxis del lenguaje:
   - `.js`, `.jsx`, `.ts`, `.tsx`, `.css`, `.scss`: `// <ruta/completa/hasta/el/archivo.ext>`
   - `.sql`: `-- <ruta/completa/hasta/el/archivo.sql>`
   - `.html`: `<!-- <ruta/completa/hasta/el/archivo.html> -->`
3. **Protección al editar:**
   - Si el archivo ya posee su ruta en la línea 1, consérvala intacta.
   - Si editas un archivo de código fuente que aún no tiene el encabezado, agrégalo en la línea 1 respetando su ubicación real.
   - Si mueves o renombras el archivo, actualiza la ruta de la línea 1 para que coincida con la nueva ubicación y extensión.
