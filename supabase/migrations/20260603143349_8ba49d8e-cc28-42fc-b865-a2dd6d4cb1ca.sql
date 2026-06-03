
-- 1) Soft delete columns
ALTER TABLE public.celulares
  ADD COLUMN IF NOT EXISTS eliminado boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS fecha_eliminacion timestamptz;

CREATE INDEX IF NOT EXISTS idx_celulares_eliminado ON public.celulares (eliminado);

-- 2) Historial de cambios
CREATE TABLE public.celulares_historial (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  celular_id uuid NOT NULL,
  user_id uuid,
  accion text NOT NULL, -- insert | update | delete | soft_delete | restore
  diff jsonb,
  fecha timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.celulares_historial TO authenticated;
GRANT ALL ON public.celulares_historial TO service_role;

ALTER TABLE public.celulares_historial ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated can read historial"
  ON public.celulares_historial FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated can insert historial"
  ON public.celulares_historial FOR INSERT TO authenticated WITH CHECK (true);

CREATE INDEX idx_historial_celular ON public.celulares_historial (celular_id, fecha DESC);

-- 3) Trigger to log changes
CREATE OR REPLACE FUNCTION public.log_celular_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_diff jsonb;
  v_accion text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_accion := 'insert';
    v_diff := to_jsonb(NEW);
    INSERT INTO public.celulares_historial (celular_id, user_id, accion, diff)
      VALUES (NEW.id, v_user, v_accion, v_diff);
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.eliminado IS DISTINCT FROM OLD.eliminado THEN
      v_accion := CASE WHEN NEW.eliminado THEN 'soft_delete' ELSE 'restore' END;
    ELSE
      v_accion := 'update';
    END IF;
    -- only changed fields
    SELECT jsonb_object_agg(key, jsonb_build_object('old', o.value, 'new', n.value))
      INTO v_diff
      FROM jsonb_each(to_jsonb(OLD)) o
      JOIN jsonb_each(to_jsonb(NEW)) n USING (key)
     WHERE o.value IS DISTINCT FROM n.value
       AND key NOT IN ('fecha_actualizacion');
    IF v_diff IS NOT NULL THEN
      INSERT INTO public.celulares_historial (celular_id, user_id, accion, diff)
        VALUES (NEW.id, v_user, v_accion, v_diff);
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.celulares_historial (celular_id, user_id, accion, diff)
      VALUES (OLD.id, v_user, 'delete', to_jsonb(OLD));
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_celular_changes ON public.celulares;
CREATE TRIGGER trg_log_celular_changes
AFTER INSERT OR UPDATE OR DELETE ON public.celulares
FOR EACH ROW EXECUTE FUNCTION public.log_celular_changes();
