-- Corregir la función de trigger para evitar ambigüedad en las columnas
CREATE OR REPLACE FUNCTION notify_document_status_change()
RETURNS TRIGGER AS $$
DECLARE
  document_title TEXT;
  doc_code TEXT;
  department_name TEXT;
  user_id UUID;
BEGIN
  -- Obtener información del documento con alias de tabla explícito
  SELECT d.title, d.document_code 
  INTO document_title, doc_code
  FROM documents d
  WHERE d.id = NEW.document_id;

  -- Obtener nombre del departamento con alias de tabla explícito
  SELECT d.name INTO department_name
  FROM departments d
  WHERE d.id = NEW.to_department_id;

  -- Obtener usuario asociado al departamento con alias de tabla explícito
  FOR user_id IN
    SELECT u.id FROM users u WHERE u.department_id = NEW.to_department_id
  LOOP
    -- Insertar notificación con nombres de columnas explícitos
    INSERT INTO notifications (
      user_id,
      document_id,
      document_code,
      title,
      message,
      type
    )
    VALUES (
      user_id,
      NEW.document_id,
      doc_code,
      'Nuevo movimiento de documento',
      'El documento ' || doc_code || ' (' || document_title || ') ha sido ' || 
      CASE 
        WHEN NEW.action = 'derivado' THEN 'derivado a tu departamento'
        WHEN NEW.action = 'revision' THEN 'marcado para revisión'
        WHEN NEW.action = 'pendiente' THEN 'marcado como pendiente'
        WHEN NEW.action = 'en_proceso' THEN 'marcado como en proceso'
        WHEN NEW.action = 'completado' THEN 'completado'
        WHEN NEW.action = 'rechazado' THEN 'rechazado'
        ELSE 'actualizado'
      END,
      CASE 
        WHEN NEW.action = 'completado' THEN 'success'
        WHEN NEW.action = 'rechazado' THEN 'error'
        WHEN NEW.action = 'pendiente' THEN 'warning'
        ELSE 'info'
      END
    );
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recrear el trigger
DROP TRIGGER IF EXISTS document_status_change_trigger ON movements;

CREATE TRIGGER document_status_change_trigger
AFTER INSERT ON movements
FOR EACH ROW
EXECUTE FUNCTION notify_document_status_change();
