// frontend/test/UserListPage.test.jsx
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import UserListPage from "../src/features/users/pages/UserListPage";
import { useAuth } from "../src/features/auth/context/AuthContext";
import * as api from "../src/services/api";

vi.mock("../src/features/auth/context/AuthContext", () => ({
  useAuth: vi.fn(),
}));

vi.mock("../src/services/api", () => ({
  listarUsuarios: vi.fn(),
  verifyPassword: vi.fn(),
  cambiarEstadoUsuario: vi.fn(),
}));

describe("UserListPage", () => {
  it("debería listar usuarios correctamente", async () => {
    useAuth.mockReturnValue({ usuario: { id_usuario: 1 } });
    api.listarUsuarios.mockResolvedValue({
      rows: [
        { id_usuario: 2, usuario_login: "operador1", nombres: "Juan", apellidos: "Perez", rol: "operador", estado: "activo" },
      ],
      total: 1,
    });

    render(
      <MemoryRouter>
        <UserListPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("operador1")).toBeInTheDocument();
      expect(screen.getByText("Juan Perez")).toBeInTheDocument();
    });
  });

  it("debería abrir modal de nueva contraseña al hacer clic", async () => {
    useAuth.mockReturnValue({ usuario: { id_usuario: 1 } });
    api.listarUsuarios.mockResolvedValue({ rows: [{ id_usuario: 2, usuario_login: "user2", rol: "operador", estado: "activo" }], total: 1 });

    render(
      <MemoryRouter>
        <UserListPage />
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByText("user2")).toBeInTheDocument());

    const btnClave = screen.getByText(/clave/i);
    fireEvent.click(btnClave);

    expect(screen.getByText(/confirme con su clave de administrador/i)).toBeInTheDocument();
  });
});
