// frontend/test/FormularioSalida.test.jsx
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import FormularioSalida from "../src/Components/ingreso-salida/FormularioSalida";
import * as api from "../src/services/api";

// Mock de la API
vi.mock("../src/services/api", () => ({
  buscarVehiculosDentro: vi.fn(),
  registrarMovimiento: vi.fn(),
}));

describe("FormularioSalida", () => {
  it("debería buscar y mostrar un vehículo encontrado", async () => {
    const mockVehiculo = { 
      placa: "ABC123", 
      tipo: "carro", 
      celda: "A1", 
      propietario: "Juan Perez",
      entrada: { fecha: "2026-11-10", hora: "10:00" },
      salida: { fecha: "2026-11-10", hora: "11:00" },
      permanencia: "1h" 
    };
    api.buscarVehiculosDentro.mockResolvedValue([mockVehiculo]);

    render(<FormularioSalida />);

    fireEvent.change(screen.getByPlaceholderText(/placa o documento/i), { target: { value: "ABC123" } });
    fireEvent.click(screen.getByText(/buscar/i));

    await waitFor(() => {
      expect(screen.getByText(/confirmar salida/i)).toBeInTheDocument();
    });
  });

  it("debería registrar la salida exitosamente", async () => {
    const mockVehiculo = { 
      placa: "ABC123", 
      id_acceso: 1,
      tipo: "carro", 
      celda: "A1", 
      propietario: "Juan Perez",
      entrada: { fecha: "2026-11-10", hora: "10:00" },
      salida: { fecha: "2026-11-10", hora: "11:00" },
      permanencia: "1h" 
    };
    api.buscarVehiculosDentro.mockResolvedValue([mockVehiculo]);
    api.registrarMovimiento.mockResolvedValue({ id: 100, placa: "ABC123", tipo: "salida" });

    render(<FormularioSalida />);

    // Buscar
    fireEvent.change(screen.getByPlaceholderText(/placa o documento/i), { target: { value: "ABC123" } });
    fireEvent.click(screen.getByText(/buscar/i));

    await waitFor(() => {
      expect(screen.getByText(/confirmar salida/i)).toBeInTheDocument();
    });

    // Registrar salida
    fireEvent.click(screen.getByText(/confirmar salida/i));

    await waitFor(() => {
      expect(screen.getByText(/nueva salida/i)).toBeInTheDocument();
    });
  });
});
