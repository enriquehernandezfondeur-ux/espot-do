-- Función RPC para verificar disponibilidad de un espacio en un horario dado.
-- Maneja correctamente cruces de medianoche (end_time < start_time).
-- Retorna TRUE si el horario está disponible, FALSE si hay conflicto.

CREATE OR REPLACE FUNCTION check_space_availability(
  p_space_id   UUID,
  p_event_date DATE,
  p_start_time TIME,
  p_end_time   TIME,
  p_exclude_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  crosses_midnight BOOLEAN;
  conflict_count   INTEGER;
BEGIN
  crosses_midnight := p_end_time < p_start_time;

  IF crosses_midnight THEN
    -- El nuevo booking cruza medianoche: hay overlap si el existente empieza antes del fin
    -- del nuevo O termina después del inicio del nuevo.
    SELECT COUNT(*) INTO conflict_count
    FROM bookings
    WHERE space_id   = p_space_id
      AND event_date = p_event_date
      AND status NOT IN ('rejected', 'cancelled_guest', 'cancelled_host')
      AND (p_exclude_id IS NULL OR id != p_exclude_id)
      AND (start_time < p_end_time OR end_time > p_start_time);
  ELSE
    -- Booking normal: overlap estándar (inicio existente < fin nuevo AND fin existente > inicio nuevo)
    SELECT COUNT(*) INTO conflict_count
    FROM bookings
    WHERE space_id   = p_space_id
      AND event_date = p_event_date
      AND status NOT IN ('rejected', 'cancelled_guest', 'cancelled_host')
      AND (p_exclude_id IS NULL OR id != p_exclude_id)
      AND start_time < p_end_time
      AND end_time   > p_start_time;
  END IF;

  RETURN conflict_count = 0;
END;
$$;

-- Permitir que el rol anon y authenticated llamen a esta función
GRANT EXECUTE ON FUNCTION check_space_availability(UUID, DATE, TIME, TIME, UUID) TO anon, authenticated;
