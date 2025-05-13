-- Verificar si la tabla de notificaciones existe
SELECT EXISTS (
   SELECT FROM information_schema.tables 
   WHERE table_schema = 'public'
   AND table_name = 'notifications'
);

-- Mostrar la estructura de la tabla si existe
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'notifications';

-- Mostrar algunas notificaciones de ejemplo
SELECT * FROM notifications LIMIT 5;
