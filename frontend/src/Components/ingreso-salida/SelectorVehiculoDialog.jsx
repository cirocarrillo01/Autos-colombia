//frontend/src/Components/ingreso-salida/SelectorVehiculoDialog.jsx
// Pantalla flotante para escoger un vehículo cuando un documento tiene varios.

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";

/**
 * @param {Object} props
 * @param {boolean} props.abierto
 * @param {string} props.titulo
 * @param {string} [props.descripcion]
 * @param {Array<{key: string|number, titulo: string, detalle?: string,
 *   deshabilitado?: boolean, motivo?: string, original: any}>} props.opciones
 * @param {(original: any) => void} props.onSeleccionar
 * @param {() => void} props.onCerrar
 */
export default function SelectorVehiculoDialog({
  abierto,
  titulo,
  descripcion,
  opciones = [],
  onSeleccionar,
  onCerrar,
}) {
  return (
    <Dialog open={abierto} onClose={onCerrar} maxWidth="xs" fullWidth>
      <DialogTitle>{titulo}</DialogTitle>
      <DialogContent dividers>
        {descripcion && <p style={{ marginTop: 0 }}>{descripcion}</p>}
        <div className="Selector-lista">
          {opciones.map((o) => (
            <button
              key={o.key}
              type="button"
              className="Selector-opcion"
              disabled={o.deshabilitado}
              onClick={() => onSeleccionar(o.original)}
            >
              <span className="Selector-titulo">{o.titulo}</span>
              {o.detalle && (
                <span className="Selector-detalle">{o.detalle}</span>
              )}
              {o.deshabilitado && o.motivo && (
                <span className="Selector-motivo">{o.motivo}</span>
              )}
            </button>
          ))}
        </div>
      </DialogContent>
      <DialogActions>
        <button type="button" className="Btn" onClick={onCerrar}>
          Cancelar
        </button>
      </DialogActions>
    </Dialog>
  );
}