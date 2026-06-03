import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { generateText, Output } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";

const VozSchema = z.object({
  marca: z.string(),
  modelo: z.string(),
  precio_compra: z.number(),
  problemas: z.string(),
  observaciones: z.string(),
});

export const interpretarVoz = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ texto: z.string().min(2).max(2000) }).parse(input),
  )
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Falta LOVABLE_API_KEY");
    const gateway = createLovableAiGatewayProvider(key);
    const { experimental_output } = await generateText({
      model: gateway("google/gemini-3-flash-preview"),
      experimental_output: Output.object({ schema: VozSchema }),
      system:
        "Extraés datos de un celular usado a partir de descripciones en español rioplatense. Los precios pueden venir como '200 mil', '200000', '200k', '1,5 millones'. Convertilo a número entero. Si no hay un dato, devolvé string vacío o 0. Marcas comunes: Samsung, Apple/iPhone, Motorola, Xiaomi, Huawei, LG.",
      prompt: data.texto,
    });
    return experimental_output;
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
