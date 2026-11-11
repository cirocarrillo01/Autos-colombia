// frontend/src/hooks/useAutoLimpiar.js
// Ejecuta `onLimpiar` tras `ms` de inactividad mientras `activo` sea true.
import { useEffect, useRef } from "react";

export function useAutoLimpiar(activo, onLimpiar, ms = 35000) {
  const cb = useRef(onLimpiar);

  // Mantén el ref actualizado sin re-armar el temporizador.
  useEffect(() => {
    cb.current = onLimpiar;
  }, [onLimpiar]);

  useEffect(() => {
    if (!activo) return undefined;

    const t = setTimeout(() => {
      cb.current();
    }, ms);

    return () => clearTimeout(t);
  }, [activo, ms]);
}

export default useAutoLimpiar;