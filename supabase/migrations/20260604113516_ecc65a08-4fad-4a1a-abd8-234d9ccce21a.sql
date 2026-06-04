CREATE TYPE public.repuesto_categoria AS ENUM ('modulo','placa_carga','bateria','porta_sim','flex','camara','tapa','placa_main','otro');

CREATE TABLE public.repuestos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  categoria public.repuesto_categoria NOT NULL DEFAULT 'otro',
  marca text NOT NULL DEFAULT '',
  modelo_compatible text NOT NULL DEFAULT '',
  precio_compra numeric NOT NULL DEFAULT 0,
  precio_venta numeric NOT NULL DEFAULT 0,
  stock integer NOT NULL DEFAULT 1,
  observaciones text,
  eliminado boolean NOT NULL DEFAULT false,
  fecha_eliminacion timestamptz,
  fecha_creacion timestamptz NOT NULL DEFAULT now(),
  fecha_actualizacion timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.repuestos TO authenticated;
GRANT ALL ON public.repuestos TO service_role;

ALTER TABLE public.repuestos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users can read own repuestos" ON public.repuestos
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "users can insert own repuestos" ON public.repuestos
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users can update own repuestos" ON public.repuestos
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "only admins can delete repuestos" ON public.repuestos
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER trg_repuestos_updated
  BEFORE UPDATE ON public.repuestos
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();