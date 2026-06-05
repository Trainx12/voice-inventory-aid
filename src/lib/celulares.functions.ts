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
      .eq("eliminado", false)
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
    const { error } = await context.supabase
      .from("celulares")
      .update({ eliminado: true, fecha_eliminacion: new Date().toISOString() })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listPapelera = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("celulares")
      .select("*")
      .eq("eliminado", true)
      .order("fecha_eliminacion", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const restaurarCelular = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("celulares")
      .update({ eliminado: false, fecha_eliminacion: null })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const eliminarDefinitivo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("celulares").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listHistorial = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("celulares_historial")
      .select("*")
      .order("fecha", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return data ?? [];
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

const CelularBulkItem = z.object({
  marca: z.string().min(1).max(80),
  modelo: z.string().min(1).max(120),
  imei: z.string().max(40).optional().nullable(),
  precio_compra: z.coerce.number().min(0).default(0),
  precio_venta: z.coerce.number().min(0).default(0),
  estado: z.string().max(40).default("disponible"),
  problemas: z.string().max(2000).optional().nullable(),
  observaciones: z.string().max(2000).optional().nullable(),
  fecha_compra: z.string().default(() => new Date().toISOString().slice(0, 10)),
});

export const bulkInsertCelulares = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ items: z.array(CelularBulkItem).min(1).max(500) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const rows = data.items.map((i) => ({ ...i, imagenes: [], user_id: context.userId }));
    const { error } = await context.supabase.from("celulares").insert(rows);
    if (error) throw new Error(error.message);
    return { count: rows.length };
  });
