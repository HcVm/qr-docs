-- Crear la tabla de notificaciones
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) NOT NULL,
  document_id UUID REFERENCES documents(id) NOT NULL,
  document_code VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(20) DEFAULT 'info',
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_document_id ON notifications(document_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);

-- Crear función para notificar cambios de estado en documentos
CREATE OR REPLACE FUNCTION notify_document_status_change()
RETURNS TRIGGER AS $$
DECLARE
  document_title TEXT;
  document_code TEXT;
  department_name TEXT;
  user_id UUID;
BEGIN
  -- Obtener información del documento
  SELECT title, document_code INTO document_title, document_code
  FROM documents
  WHERE id = NEW.document_id;
  
  -- Obtener nombre del departamento
  SELECT name INTO department_name
  FROM departments
  WHERE id = NEW.to_department_id;
  
  -- Obtener usuario asociado al departamento
  FOR user_id IN
    SELECT id FROM users WHERE department_id = NEW.to_department_id
  LOOP
    -- Insertar notificación
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
      document_code,
      'Nuevo movimiento de documento',
      'El documento ' || document_code || ' (' || document_title || ') ha sido ' || 
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

-- Crear el trigger
DROP TRIGGER IF EXISTS document_status_change_trigger ON movements;

CREATE TRIGGER document_status_change_trigger
AFTER INSERT ON movements
FOR EACH ROW
EXECUTE FUNCTION notify_document_status_change();
