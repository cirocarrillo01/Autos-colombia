-- Los rechazos se guardan como "entrada_rechazada" / "salida_rechazada"
ALTER TABLE audit_log MODIFY accion VARCHAR(50) NOT NULL;