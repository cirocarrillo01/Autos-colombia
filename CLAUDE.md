# Reglas de Trabajo para CanchaControl

Basado en los principios de Karpathy para agentes de codificación.

## 1. Think Before Coding
* **No asumas:** Si la intención del usuario es ambigua, pregunta antes de implementar.
* **Surface Tradeoffs:** Presenta las opciones antes de elegir una arquitectura compleja.
* **Admite confusión:** Si un flujo del backend o frontend no está claro, nómbralo y pide aclaración.

## 2. Simplicity First
* **Mínimo código:** Resuelve el problema con la menor cantidad de código posible.
* **Sin especulación:** No añadas funcionalidades "por si acaso" o abstracciones innecesarias.
* **Reutiliza:** Prefiere usar los componentes existentes de Material UI en `frontend/src/components`.

## 3. Surgical Changes
* **Edición quirúrgica:** Toca solo los archivos necesarios para la tarea actual. No refactorices código que ya funciona.
* **Estilo consistente:** Sigue estrictamente el estilo de código del proyecto, incluso si prefieres otra forma.
* **Cleanup propio:** Si generas código muerto (imports, variables, funciones) durante un cambio, elimínalo; no toques código muerto preexistente.

## 4. Goal-Driven Execution
* **Criterios de éxito:** Define qué significa "terminado" antes de empezar (ej. "el endpoint `/api/availability` devuelve datos con formato correcto").
* **Verificación:** Si el cambio es en el backend, prioriza la creación o ejecución de tests en `backend/tests` para verificar el cambio.
* **Loops independientes:** Plantea un plan de pasos numerados con su verificación antes de ejecutar.

## Reglas Específicas para CanchaControl
* **Backend:** Respetar la estructura de carpetas en `backend/src`. Las validaciones van en `backend/src/validators`.
* **Frontend:** Usar la instancia de `API` definida en `frontend/src/api/axios.js` para todas las llamadas al servidor.
* **UI:** Priorizar `MUI (Material UI)` para todos los componentes nuevos.
* **Estado:** Mantener la lógica de autenticación centralizada en `frontend/src/context/AuthContext.jsx`.
