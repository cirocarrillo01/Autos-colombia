// frontend/src/components/ui/Toast.jsx
// Toast global reutilizable con estilos de global.css

import { useEffect, useState } from "react";

export default function Toast({ message, type = "success", onClose, duration = 4000 }) {
  const [visible, setVisible] = useState(!!message);

  useEffect(() => {
    if (!message) {
      setVisible(false);
      return;
    }
    setVisible(true);
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onClose?.(), 300); // espera animación
    }, duration);
    return () => clearTimeout(timer);
  }, [message, duration, onClose]);

  if (!visible || !message) return null;

  const className = `mn-toast mn-toast--${type}`;

  return (
    <div
      className={className}
      role="status"
      aria-live="polite"
      onClick={() => setVisible(false)}
    >
      {message}
    </div>
  );
}