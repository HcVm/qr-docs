-- Verificar si la tabla notifications existe
SELECT EXISTS (
   SELECT FROM information_schema.tables 
   WHERE table_schema = 'public'
   AND table_name = 'notifications'
);

-- Mostrar la estructura de la tabla notifications
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'notifications';

-- Verificar si hay datos en la tabla notifications
SELECT COUNT(*) FROM notifications;

-- Verificar si hay políticas de seguridad en la tabla notifications
SELECT * FROM pg_policies WHERE tablename = 'notifications';
