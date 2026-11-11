// frontend/test/FormularioIngreso.test.jsx
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import FormularioIngreso from "../src/Components/ingreso-salida/FormularioIngreso";
import * as api from "../src/services/api";

vi.mock("../src/services/api", () => ({
  buscarVehiculo: vi.fn(),
  buscarVehiculosPorDocumento: vi.fn(),
  obtenerCeldasDisponibles: vi.fn(),
  registrarMovimiento: vi.fn(),
}));

describe("FormularioIngreso", () => {
  it("debería buscar un vehículo y mostrar celdas disponibles", async () => {
    const mockVehiculo = {
      placa: "ABC123",
      tipo: "carro",
      tipoCodigo: "CAR",
      estado: "Fuera",
      estadoMensualidad: "Al día",
    };
    const mockCeldas = [{ id_celda: 1, codigo: "A1" }];

    api.buscarVehiculo.mockResolvedValue(mockVehiculo);
    api.obtenerCeldasDisponibles.mockResolvedValue(mockCeldas);

    render(<FormularioIngreso />);

    fireEvent.change(screen.getByPlaceholderText(/placa o documento/i), { target: { value: "ABC123" } });
    fireEvent.click(screen.getByText(/buscar/i));

    await waitFor(() => {
      expect(screen.getByText("A1")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /ingresar/i })).toBeInTheDocument();
    });
  });

  it("debería registrar el ingreso al seleccionar una celda", async () => {
    const mockVehiculo = {
      placa: "ABC123",
      tipo: "carro",
      tipoCodigo: "CAR",
      estado: "Fuera",
      estadoMensualidad: "Al día",
    };
    const mockCeldas = [{ id_celda: 1, codigo: "A1" }];

    api.buscarVehiculo.mockResolvedValue(mockVehiculo);
    api.obtenerCeldasDisponibles.mockResolvedValue(mockCeldas);
    api.registrarMovimiento.mockResolvedValue({ id: 10, placa: "ABC123", tipo: "entrada" });

    render(<FormularioIngreso />);

    fireEvent.change(screen.getByPlaceholderText(/placa o documento/i), { target: { value: "ABC123" } });
    fireEvent.click(screen.getByText(/buscar/i));

    await waitFor(() => {
      expect(screen.getByText("A1")).toBeInTheDocument();
    });

    // Seleccionar celda
    fireEvent.click(screen.getByText("A1"));

    // Hacer clic en Ingresar
    fireEvent.click(screen.getByRole("button", { name: /ingresar/i }));

    await waitFor(() => {
      expect(screen.getByText(/nuevo ingreso/i)).toBeInTheDocument();
    });
  });
});
