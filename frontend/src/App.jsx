//frontend/src/App.jsx
// Componente raíz: define rutas públicas (/login) y protegidas (/*).

import { Routes, Route } from "react-router-dom";
import ProtectedRoute from "./Components/ProtectedRoute.jsx";
import LoginPage from "./features/auth/pages/LoginPage.jsx";
import AppRoutes from "./routes/AppRoutes.jsx";

/**
 * Componente App - Enrutador de alto nivel.
 * - /login: página pública de login.
 * - /*: todas las demás rutas protegidas (requieren sesión).
 */
function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <AppRoutes />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default App;