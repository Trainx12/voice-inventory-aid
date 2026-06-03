import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const CelularInput = z.object({
  id: z.string().uuid().optional(),
  marca: z.string().min(1).max(80),
  modelo: z.string().min(1).max(120),
  imei: z.string().max(40).optional().nullable(),
  precio_compra: z.number().min(0),
  precio_venta: z.number().min(0),
  estado: z.string().min(1).max(40),
  problemas: z.string().max(2000).optional().nullable(),
  observaciones: z.string().max(2000).optional().nullable(),
  fecha_compra: z.string(),
  imagenes: z.array(z.string()).default([]),
});

export const listCelulares = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("celulares")
      .select("*")
      .order("fecha_creacion", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const upsertCelular = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => CelularInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    if (data.id) {
      const { id, ...rest } = data;
      const { error } = await supabase.from("celulares").update(rest).eq("id", id);
      if (error) throw new Error(error.message);
      return { id };
    }
    const { data: row, error } = await supabase
      .from("celulares")
      .insert({ ...data, user_id: userId })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const marcarVendido = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid(), vendido: z.boolean() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("celulares")
      .update({
        vendido: data.vendido,
        estado: data.vendido ? "vendido" : "disponible",
        fecha_venta: data.vendido ? new Date().toISOString() : null,
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const eliminarCelular = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("celulares").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getMyRole = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    const roles = (data ?? []).map((r) => r.role);
    return { roles, isAdmin: roles.includes("admin") };
  });

export const signedUrlsFor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ paths: z.array(z.string()).max(50) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    if (data.paths.length === 0) return { urls: [] as string[] };
    const { data: signed, error } = await context.supabase.storage
      .from("celulares")
      .createSignedUrls(data.paths, 60 * 60);
    if (error) throw new Error(error.message);
    return { urls: signed.map((s) => s.signedUrl) };
  });
