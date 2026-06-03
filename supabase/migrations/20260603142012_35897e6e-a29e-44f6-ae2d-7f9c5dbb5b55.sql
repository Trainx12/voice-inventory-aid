
-- Roles enum + table
CREATE TYPE public.app_role AS ENUM ('admin', 'empleado');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users can view their own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Auto-asignar rol al registrarse: primer usuario = admin, resto = empleado
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_count int;
BEGIN
  SELECT COUNT(*) INTO user_count FROM auth.users;
  IF user_count <= 1 THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'empleado');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created_role
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_role();

-- Celulares
CREATE TABLE public.celulares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  marca TEXT NOT NULL,
  modelo TEXT NOT NULL,
  imei TEXT,
  precio_compra NUMERIC(12,2) NOT NULL DEFAULT 0,
  precio_venta NUMERIC(12,2) NOT NULL DEFAULT 0,
  estado TEXT NOT NULL DEFAULT 'disponible',
  problemas TEXT,
  observaciones TEXT,
  fecha_compra DATE NOT NULL DEFAULT CURRENT_DATE,
  imagenes TEXT[] NOT NULL DEFAULT '{}',
  vendido BOOLEAN NOT NULL DEFAULT false,
  fecha_venta TIMESTAMPTZ,
  fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT now(),
  fecha_actualizacion TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX celulares_user_idx ON public.celulares(user_id);
CREATE INDEX celulares_marca_idx ON public.celulares(marca);
CREATE INDEX celulares_vendido_idx ON public.celulares(vendido);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.celulares TO authenticated;
GRANT ALL ON public.celulares TO service_role;

ALTER TABLE public.celulares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated can read all celulares"
  ON public.celulares FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated can insert celulares"
  ON public.celulares FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "authenticated can update celulares"
  ON public.celulares FOR UPDATE TO authenticated USING (true);

CREATE POLICY "only admins can delete celulares"
  ON public.celulares FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Trigger fecha_actualizacion
CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.fecha_actualizacion = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER celulares_set_updated
  BEFORE UPDATE ON public.celulares
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
