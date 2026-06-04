import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { generateText } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";

const VozSchema = z.object({
  transcripcion: z.string().optional().default(""),
  marca: z.string().optional().default(""),
  modelo: z.string().optional().default(""),
  precio_compra: z.number().optional().default(0),
  problemas: z.string().optional().default(""),
  observaciones: z.string().optional().default(""),
});

const CATEGORIAS_REP = ["modulo","placa_carga","bateria","porta_sim","flex","camara","tapa","placa_main","otro"] as const;
const RepuestoVozSchema = z.object({
  transcripcion: z.string().optional().default(""),
  categoria: z.enum(CATEGORIAS_REP).optional().default("otro"),
  marca: z.string().optional().default(""),
  modelo_compatible: z.string().optional().default(""),
  precio_compra: z.number().optional().default(0),
  precio_venta: z.number().optional().default(0),
  stock: z.number().int().optional().default(1),
  observaciones: z.string().optional().default(""),
});

const VozInputSchema = z
  .object({
    texto: z.string().max(2000).optional().default(""),
    audioBase64: z.string().max(12_000_000).optional(),
    mediaType: z.enum(["audio/wav", "audio/mp3", "audio/mpeg"]).optional().default("audio/wav"),
  })
  .refine((data) => data.texto.trim().length >= 2 || (data.audioBase64?.length ?? 0) > 1000, {
    message: "Decí algo o escribí una descripción antes de interpretar.",
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
  .inputValidator((input: unknown) => VozInputSchema.parse(input))
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Falta LOVABLE_API_KEY");
    const gateway = createLovableAiGatewayProvider(key);
    const instruction =
      "Extraé datos de un celular usado a partir de voz o texto en español rioplatense. Los precios pueden venir como '200 mil', '200000', '200k', '1,5 millones'. Convertilo a número entero. Si falta un dato, devolvé string vacío o 0. Marcas comunes: Samsung, Apple/iPhone, Motorola, Xiaomi, Huawei, LG.\n\nRespondé SOLO con un objeto JSON válido con estas claves exactas: transcripcion (string), marca (string), modelo (string), precio_compra (number), problemas (string), observaciones (string). Sin texto adicional, sin markdown.";

    const { text } = data.audioBase64
      ? await generateText({
          model: gateway("google/gemini-3-flash-preview"),
          system: instruction,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: `Transcribí este audio y extraé los datos del celular.${data.texto.trim() ? ` Texto detectado por el navegador: ${data.texto.trim()}` : ""}`,
                },
                {
                  type: "file",
                  mediaType: data.mediaType,
                  data: data.audioBase64,
                },
              ],
            },
          ],
        })
      : await generateText({
          model: gateway("google/gemini-3-flash-preview"),
          system: instruction,
          prompt: data.texto,
        });
    try {
      const parsed = extractJSON(text);
      return VozSchema.parse(parsed);
    } catch {
      return { transcripcion: data.texto || text, marca: "", modelo: "", precio_compra: 0, problemas: "", observaciones: text };
    }
  });

export const interpretarVozRepuesto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => VozInputSchema.parse(input))
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Falta LOVABLE_API_KEY");
    const gateway = createLovableAiGatewayProvider(key);
    const instruction =
      "Extraé datos de un REPUESTO de celular a partir de voz o texto en español rioplatense. Devolvé SOLO un JSON con las claves: transcripcion (string), categoria (uno de: modulo, placa_carga, bateria, porta_sim, flex, camara, tapa, placa_main, otro), marca (string), modelo_compatible (string), precio_compra (number), precio_venta (number), stock (number entero, default 1), observaciones (string).\n\nMapeo de categoría desde el habla coloquial: 'módulo'/'pantalla'/'display' => modulo; 'pin de carga'/'placa de carga'/'conector de carga' => placa_carga; 'batería'/'pila' => bateria; 'porta sim'/'bandeja sim'/'lector sim' => porta_sim; 'flex'/'flex de power'/'flex de volumen' => flex; 'cámara'/'lente' => camara; 'tapa'/'tapa trasera'/'tapa de batería' => tapa; 'placa main'/'placa madre'/'lógica'/'mother' => placa_main. Si no entra en ninguna, usá 'otro'.\n\nLos precios pueden venir como '15 mil', '15000', '15k'. Convertilos a entero. Si falta un dato, devolvé string vacío o 0. Sin texto adicional, sin markdown.";

    const { text } = data.audioBase64
      ? await generateText({
          model: gateway("google/gemini-3-flash-preview"),
          system: instruction,
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: `Transcribí este audio y extraé los datos del repuesto.${data.texto.trim() ? ` Texto detectado por el navegador: ${data.texto.trim()}` : ""}` },
                { type: "file", mediaType: data.mediaType, data: data.audioBase64 },
              ],
            },
          ],
        })
      : await generateText({
          model: gateway("google/gemini-3-flash-preview"),
          system: instruction,
          prompt: data.texto,
        });
    try {
      const parsed = extractJSON(text);
      return RepuestoVozSchema.parse(parsed);
    } catch {
      return { transcripcion: data.texto || text, categoria: "otro" as const, marca: "", modelo_compatible: "", precio_compra: 0, precio_venta: 0, stock: 1, observaciones: text };
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
