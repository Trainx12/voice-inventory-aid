import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { generateText } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";

const VozSchema = z.object({
  marca: z.string().optional().default(""),
  modelo: z.string().optional().default(""),
  precio_compra: z.number().optional().default(0),
  problemas: z.string().optional().default(""),
  observaciones: z.string().optional().default(""),
});

function extractJSON(raw: string): unknown {
  let cleaned = raw.replace(/^```json\s*/im, "").replace(/^```\s*/im, "").replace(/```\s*$/im, "").trim();
  if (!cleaned.startsWith("{")) {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start !== -1 && end > start) cleaned = cleaned.slice(start, end + 1);
  }
  return JSON.parse(cleaned);
}

export const interpretarVoz = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ texto: z.string().min(2).max(2000) }).parse(input),
  )
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Falta LOVABLE_API_KEY");
    const gateway = createLovableAiGatewayProvider(key);
    const { text } = await generateText({
      model: gateway("google/gemini-3-flash-preview"),
      system:
        "Extraés datos de un celular usado a partir de descripciones en español rioplatense. Los precios pueden venir como '200 mil', '200000', '200k', '1,5 millones'. Convertilo a número entero. Si falta un dato, devolvé string vacío o 0. Marcas comunes: Samsung, Apple/iPhone, Motorola, Xiaomi, Huawei, LG.\n\nRespondé SOLO con un objeto JSON válido con estas claves exactas: marca (string), modelo (string), precio_compra (number), problemas (string), observaciones (string). Sin texto adicional, sin markdown.",
      prompt: data.texto,
    });
    try {
      const parsed = extractJSON(text);
      return VozSchema.parse(parsed);
    } catch {
      return { marca: "", modelo: "", precio_compra: 0, problemas: "", observaciones: text };
    }
  });

export const consultaAsistente = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ pregunta: z.string().min(1).max(500) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("celulares")
      .select("marca,modelo,estado,problemas,precio_compra,precio_venta,vendido,fecha_creacion")
      .eq("eliminado", false)
      .order("fecha_creacion", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);

    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Falta LOVABLE_API_KEY");
    const gateway = createLovableAiGatewayProvider(key);
    const { text } = await generateText({
      model: gateway("google/gemini-3-flash-preview"),
      system:
        "Sos un asistente de inventario de celulares usados. Respondés en español, breve y directo. Usás SOLO los datos del inventario que te paso en JSON. Si no hay datos suficientes, decilo.",
      prompt: `Inventario actual (JSON):\n${JSON.stringify(rows)}\n\nPregunta: ${data.pregunta}`,
    });
    return { respuesta: text };
  });
