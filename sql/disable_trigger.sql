-- Desactivar temporalmente el trigger para diagnosticar el problema
ALTER TABLE movements DISABLE TRIGGER document_status_change_trigger;
