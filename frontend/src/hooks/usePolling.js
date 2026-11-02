// frontend/src/hooks/usePolling.js
// Hook de polling "inteligente":
//   - Ejecuta `callback` al montar y cada `intervalMs` ms.
//   - Se PAUSA cuando la pestaña no está visible (document.visibilityState).
//   - Se REANUDA y refresca al volver a la pestaña.
//   - Dispara un refresco inmediato cuando cambia la identidad de `callback`
//     (por ejemplo al cambiar de página o de filtros), sin esperar al intervalo.
//   - Ignora silenciosamente errores del callback; cada componente ya maneja
//     sus propios mensajes de error en su `catch`.

import { useEffect, useRef } from "react";

export function usePolling(callback, intervalMs = 30000) {
  const cbRef = useRef(callback);

  // Mantener siempre la última versión del callback sin reiniciar el interval.
  useEffect(() => {
    cbRef.current = callback;
  }, [callback]);

  // Refresco inmediato cuando cambia el callback (params, página, filtros…)
  // y la pestaña está visible.
  useEffect(() => {
    if (
      typeof document !== "undefined" &&
      document.visibilityState === "visible"
    ) {
      Promise.resolve(cbRef.current()).catch(() => {});
    }
  }, [callback]);

  // Intervalo + pausa/reanudación por visibilidad.
  useEffect(() => {
    let id = null;

    const tick = () => {
      if (document.visibilityState !== "visible") return;
      Promise.resolve(cbRef.current()).catch(() => {});
    };

    const start = () => {
      if (id) return;
      id = setInterval(tick, intervalMs);
    };

    const stop = () => {
      if (id) {
        clearInterval(id);
        id = null;
      }
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        start();
        tick(); // refresco inmediato al volver
      } else {
        stop();
      }
    };

    if (document.visibilityState === "visible") start();
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [intervalMs]);
}

export default usePolling;
