import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const CATEGORIAS = [
  "modulo","placa_carga","bateria","porta_sim","flex","camara","tapa","placa_main","otro",
] as const;

const RepuestoInput = z.object({
  id: z.string().uuid().optional(),
  categoria: z.enum(CATEGORIAS),
  marca: z.string().max(80).default(""),
  modelo_compatible: z.string().max(160).default(""),
  precio_compra: z.number().min(0).default(0),
  precio_venta: z.number().min(0).default(0),
  stock: z.number().int().min(0).default(1),
  observaciones: z.string().max(2000).optional().nullable(),
});

export const listRepuestos = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("repuestos")
      .select("*")
      .eq("eliminado", false)
      .order("fecha_creacion", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const upsertRepuesto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => RepuestoInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    if (data.id) {
      const { id, ...rest } = data;
      const { error } = await supabase.from("repuestos").update(rest).eq("id", id);
      if (error) throw new Error(error.message);
      return { id };
    }
    const { data: row, error } = await supabase
      .from("repuestos")
      .insert({ ...data, user_id: userId })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const eliminarRepuesto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("repuestos")
      .update({ eliminado: true, fecha_eliminacion: new Date().toISOString() })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const ajustarStock = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid(), delta: z.number().int() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error: e1 } = await context.supabase
      .from("repuestos").select("stock").eq("id", data.id).single();
    if (e1) throw new Error(e1.message);
    const next = Math.max(0, (row?.stock ?? 0) + data.delta);
    const { error } = await context.supabase
      .from("repuestos").update({ stock: next }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { stock: next };
  });