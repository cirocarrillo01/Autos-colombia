// frontend/src/App.jsx
import { Routes, Route } from "react-router-dom";
import ProtectedRoute from "./Components/ProtectedRoute.jsx";
import LoginPage from "./features/auth/pages/LoginPage.jsx";
import AppRoutes from "./routes/AppRoutes.jsx";

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
