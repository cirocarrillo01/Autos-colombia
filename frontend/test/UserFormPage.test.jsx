// frontend/test/UserFormPage.test.jsx
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import UserFormPage from "../src/features/users/pages/UserFormPage";
import * as api from "../src/services/api";

vi.mock("../src/services/api", () => ({
  obtenerUsuario: vi.fn(),
  registrarUsuario: vi.fn(),
  editarUsuario: vi.fn(),
}));

describe("UserFormPage", () => {
  it("debería renderizar el formulario de creación de usuario correctamente", () => {
    render(
      <MemoryRouter initialEntries={["/users/new"]}>
        <Routes>
          <Route path="/users/new" element={<UserFormPage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText("Nuevo usuario")).toBeInTheDocument();
    expect(screen.getByLabelText(/nombres/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/apellidos/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/clave de administrador/i)).toBeInTheDocument();
  });

  it("debería enviar el formulario de creación de usuario exitosamente", async () => {
    api.registrarUsuario.mockResolvedValue({ success: true });

    render(
      <MemoryRouter initialEntries={["/users/new"]}>
        <Routes>
          <Route path="/users/new" element={<UserFormPage />} />
          <Route path="/users" element={<div>Lista de Usuarios</div>} />
        </Routes>
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/número de documento/i), { target: { value: "12345678" } });
    fireEvent.change(screen.getByLabelText(/nombres/i), { target: { value: "Carlos" } });
    fireEvent.change(screen.getByLabelText(/apellidos/i), { target: { value: "Gomez" } });
    fireEvent.change(screen.getByLabelText(/^usuario de acceso$/i), { target: { value: "cgomez" } });
    fireEvent.change(screen.getByLabelText(/^clave$/i), { target: { value: "12345" } });
    fireEvent.change(screen.getByLabelText(/confirmar clave/i), { target: { value: "12345" } });
    fireEvent.change(screen.getByLabelText(/clave de administrador/i), { target: { value: "adminkey" } });

    fireEvent.click(screen.getByRole("button", { name: /guardar/i }));

    await waitFor(() => {
      expect(api.registrarUsuario).toHaveBeenCalled();
      expect(screen.getByText("Lista de Usuarios")).toBeInTheDocument();
    });
  });
});
