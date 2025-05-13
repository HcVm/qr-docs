-- Verificar si la tabla de notificaciones existe
SELECT EXISTS (
   SELECT FROM information_schema.tables 
   WHERE table_schema = 'public'
   AND table_name = 'notifications'
);

-- Mostrar las primeras 5 notificaciones si la tabla existe
SELECT * FROM notifications LIMIT 5;
