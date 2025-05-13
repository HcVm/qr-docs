-- Función para obtener movimientos por departamento
CREATE OR REPLACE FUNCTION get_movements_by_department()
RETURNS TABLE (
  department_id UUID,
  department_name TEXT,
  movement_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    d.id AS department_id,
    d.name AS department_name,
    COUNT(m.id)::BIGINT AS movement_count
  FROM 
    departments d
  LEFT JOIN 
    movements m ON d.id = m.to_department_id
  GROUP BY 
    d.id, d.name
  ORDER BY 
    movement_count DESC;
END;
$$ LANGUAGE plpgsql;

-- Función para obtener eficiencia por departamento
CREATE OR REPLACE FUNCTION get_efficiency_by_department()
RETURNS TABLE (
  department_id UUID,
  department_name TEXT,
  document_count BIGINT,
  avg_processing_time FLOAT,
  efficiency_score INTEGER
) AS $$
BEGIN
  RETURN QUERY
  WITH dept_stats AS (
    SELECT 
      d.id AS dept_id,
      d.name AS dept_name,
      COUNT(DISTINCT doc.id)::BIGINT AS doc_count,
      AVG(EXTRACT(EPOCH FROM (m2.created_at - m1.created_at))/3600)::FLOAT AS avg_time
    FROM 
      departments d
    LEFT JOIN 
      movements m1 ON d.id = m1.to_department_id
    LEFT JOIN 
      movements m2 ON m1.document_id = m2.document_id AND m1.to_department_id = m2.from_department_id
    LEFT JOIN 
      documents doc ON m1.document_id = doc.id
    WHERE 
      m2.id IS NOT NULL
    GROUP BY 
      d.id, d.name
  )
  SELECT 
    dept_id AS department_id,
    dept_name AS department_name,
    doc_count AS document_count,
    COALESCE(avg_time, 0) AS avg_processing_time,
    -- Calcular un puntaje de eficiencia basado en tiempo de procesamiento y volumen
    -- Menor tiempo = mayor eficiencia
    CASE 
      WHEN avg_time > 0 THEN 
        (100 - LEAST(CAST((avg_time / 10) AS INTEGER), 80))::INTEGER
      ELSE 50::INTEGER
    END AS efficiency_score
  FROM 
    dept_stats
  ORDER BY 
    efficiency_score DESC;
END;
$$ LANGUAGE plpgsql;

-- Función para obtener actividad por rol
CREATE OR REPLACE FUNCTION get_activity_by_role()
RETURNS TABLE (
  role_name TEXT,
  movement_count BIGINT,
  percentage INTEGER
) AS $$
DECLARE
  total_movements BIGINT;
BEGIN
  -- Obtener el total de movimientos
  SELECT COUNT(*) INTO total_movements FROM movements;
  
  -- Si no hay movimientos, devolver datos predeterminados
  IF total_movements = 0 THEN
    RETURN QUERY
    SELECT 
      'Sin datos'::TEXT AS role_name,
      0::BIGINT AS movement_count,
      100::INTEGER AS percentage;
    RETURN;
  END IF;

  -- Devolver actividad por rol
  RETURN QUERY
  WITH role_counts AS (
    SELECT 
      COALESCE(u.role, 'Usuario')::TEXT AS role,
      COUNT(m.id)::BIGINT AS count
    FROM 
      movements m
    LEFT JOIN 
      users u ON m.user_id = u.id
    GROUP BY 
      u.role
  )
  SELECT 
    role AS role_name,
    count AS movement_count,
    ROUND((count * 100.0 / total_movements))::INTEGER AS percentage
  FROM 
    role_counts
  ORDER BY 
    count DESC;
END;
$$ LANGUAGE plpgsql;

-- Función para obtener actividad por hora del día
CREATE OR REPLACE FUNCTION get_activity_by_hour()
RETURNS TABLE (
  hour_of_day TEXT,
  movement_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  WITH hours AS (
    SELECT generate_series(8, 18, 1) AS hour
  )
  SELECT 
    (hour || ':00')::TEXT AS hour_of_day,
    COUNT(m.id)::BIGINT AS movement_count
  FROM 
    hours
  LEFT JOIN 
    movements m ON EXTRACT(HOUR FROM m.created_at) = hour
  GROUP BY 
    hour
  ORDER BY 
    hour;
END;
$$ LANGUAGE plpgsql;

-- Función para obtener el tiempo promedio de procesamiento
CREATE OR REPLACE FUNCTION get_avg_processing_time()
RETURNS FLOAT AS $$
DECLARE
  avg_time FLOAT;
BEGIN
  SELECT 
    AVG(EXTRACT(EPOCH FROM (m_end.created_at - m_start.created_at))/3600) INTO avg_time
  FROM 
    movements m_start
  JOIN 
    movements m_end ON m_start.document_id = m_end.document_id
  WHERE 
    m_start.action = 'create' AND 
    (m_end.action = 'complete' OR m_end.action = 'reject');
    
  RETURN COALESCE(avg_time, 48.0);
END;
$$ LANGUAGE plpgsql;
