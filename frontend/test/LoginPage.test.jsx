// frontend/src/features/auth/pages/LoginPage.test.jsx
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import LoginPage from "../src/features/auth/pages/LoginPage";
import { useAuth } from "../src/features/auth/context/AuthContext";

// Mock de AuthContext
vi.mock("../src/features/auth/context/AuthContext", () => ({
  useAuth: vi.fn(),
}));

// Mock de react-router-dom navigate
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe("LoginPage", () => {
  it("debería renderizar el formulario correctamente", () => {
    useAuth.mockReturnValue({ isLoggedIn: false, loading: false });
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    expect(screen.getByLabelText(/usuario/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/clave/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /ingresar/i })).toBeInTheDocument();
  });

  it("debería llamar a login y redirigir al éxito", async () => {
    const mockLogin = vi.fn().mockResolvedValue({ id: 1, nombre: "Admin" });
    useAuth.mockReturnValue({
      isLoggedIn: false,
      loading: false,
      login: mockLogin,
      manejarError: vi.fn(),
    });

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/usuario/i), { target: { value: "admin" } });
    fireEvent.change(screen.getByLabelText(/clave/i), { target: { value: "password" } });
    fireEvent.click(screen.getByRole("button", { name: /ingresar/i }));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith("admin", "password");
      expect(mockNavigate).toHaveBeenCalledWith("/dashboard", { replace: true });
    });
  });

  it("debería mostrar error si el login falla", async () => {
    const mockLogin = vi.fn().mockResolvedValue(null);
    useAuth.mockReturnValue({
      isLoggedIn: false,
      loading: false,
      login: mockLogin,
      manejarError: vi.fn(),
    });

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    // Llenar campos para que el botón no esté deshabilitado si hubiera lógica extra
    fireEvent.change(screen.getByLabelText(/usuario/i), { target: { value: "test" } });
    fireEvent.change(screen.getByLabelText(/clave/i), { target: { value: "test" } });
    
    const boton = screen.getByRole("button", { name: /ingresar/i });
    fireEvent.click(boton);

    await waitFor(() => {
      expect(screen.getByText(/Error en el login. Intente nuevamente./i)).toBeInTheDocument();
    });
  });

  it("debería redirigir si ya está logueado", () => {
    useAuth.mockReturnValue({ isLoggedIn: true, loading: false });
    // Navigate is used in component, we check if it doesn't render the form
    const { container } = render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );
    // Since Navigate is a component, in MemoryRouter it won't render anything in this case
    // or we can check if the form is NOT present.
    expect(screen.queryByLabelText(/usuario/i)).not.toBeInTheDocument();
  });
});
