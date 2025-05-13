-- Función para obtener la actividad por rol
CREATE OR REPLACE FUNCTION get_activity_by_role()
RETURNS TABLE (
  role_name TEXT,
  movement_count BIGINT,
  percentage NUMERIC
) AS $$
DECLARE
  total_movements BIGINT;
BEGIN
  -- Obtener el total de movimientos
  SELECT COUNT(*) INTO total_movements FROM movements;
  
  -- Si no hay movimientos, devolver vacío
  IF total_movements = 0 THEN
    RETURN;
  END IF;
  
  -- Obtener conteo por rol y calcular porcentaje
  RETURN QUERY
  WITH role_counts AS (
    SELECT 
      COALESCE(u.role, 'Sin rol') as role,
      COUNT(m.id) as count
    FROM 
      movements m
    LEFT JOIN 
      users u ON m.user_id = u.id
    GROUP BY 
      u.role
  )
  SELECT 
    role,
    count,
    ROUND((count::numeric / total_movements) * 100, 2) as percentage
  FROM 
    role_counts
  ORDER BY 
    count DESC;
END;
$$ LANGUAGE plpgsql;

-- Función para obtener la actividad por hora del día
CREATE OR REPLACE FUNCTION get_activity_by_hour()
RETURNS TABLE (
  hour_of_day TEXT,
  movement_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    TO_CHAR(DATE_TRUNC('hour', created_at), 'HH24:00') as hour_of_day,
    COUNT(*) as movement_count
  FROM 
    movements
  GROUP BY 
    hour_of_day
  ORDER BY 
    hour_of_day;
END;
$$ LANGUAGE plpgsql;

-- Función para obtener los usuarios más activos
CREATE OR REPLACE FUNCTION get_top_users(limit_count INTEGER)
RETURNS TABLE (
  id UUID,
  name TEXT,
  email TEXT,
  movement_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id,
    u.name,
    u.email,
    COUNT(m.id) as movement_count
  FROM 
    users u
  JOIN 
    movements m ON u.id = m.user_id
  GROUP BY 
    u.id, u.name, u.email
  ORDER BY 
    movement_count DESC
  LIMIT 
    limit_count;
END;
$$ LANGUAGE plpgsql;
