//frontend/src/main.jsx
// Punto de entrada: monta Router + AuthProvider + App.

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import { AuthProvider } from "./features/auth/context/AuthContext.jsx";
import "./App.css";

/**
 * Función principal que inicializa la aplicación React.
 * Configura el enrutador (BrowserRouter), el proveedor de autenticación (AuthProvider)
 * y renderiza el componente raíz (App) en el DOM.
 * @returns {void}
 */
function bootstrap() {
  createRoot(document.getElementById("root")).render(
    <StrictMode>
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </StrictMode>,
  );
}

bootstrap();