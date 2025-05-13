-- Verificar si la tabla de notificaciones existe, si no, crearla
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
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

-- Crear o reemplazar la función para notificar cuando un documento es asignado a un departamento
CREATE OR REPLACE FUNCTION notify_document_assignment()
RETURNS TRIGGER AS $$
DECLARE
  document_title TEXT;
  document_code TEXT;
  department_name TEXT;
  user_id UUID;
  action_text TEXT;
BEGIN
  -- Obtener información del documento
  SELECT d.title, d.document_code 
  INTO document_title, document_code
  FROM documents d
  WHERE d.id = NEW.document_id;
  
  -- Obtener nombre del departamento destino
  SELECT d.name INTO department_name
  FROM departments d
  WHERE d.id = NEW.to_department_id;
  
  -- Determinar el texto de la acción
  CASE 
    WHEN NEW.action = 'derivado' THEN action_text := 'derivado a tu departamento';
    WHEN NEW.action = 'revision' THEN action_text := 'enviado para revisión';
    WHEN NEW.action = 'pendiente' THEN action_text := 'marcado como pendiente';
    WHEN NEW.action = 'completado' THEN action_text := 'completado';
    WHEN NEW.action = 'rechazado' THEN action_text := 'rechazado';
    ELSE action_text := 'actualizado';
  END CASE;
  
  -- Notificar a todos los usuarios del departamento destino
  FOR user_id IN
    SELECT u.id FROM users u WHERE u.department_id = NEW.to_department_id
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
      'Nuevo documento asignado',
      'El documento ' || document_code || ' (' || document_title || ') ha sido ' || action_text,
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

-- Eliminar el trigger si ya existe
DROP TRIGGER IF EXISTS document_assignment_trigger ON movements;

-- Crear el trigger para ejecutar la función cuando se inserta un nuevo movimiento
CREATE TRIGGER document_assignment_trigger
AFTER INSERT ON movements
FOR EACH ROW
EXECUTE FUNCTION notify_document_assignment();
