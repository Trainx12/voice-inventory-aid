import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { generateText } from "ai";
import { z } from "zod";

const CelItemSchema = z.object({
  marca: z.string().optional().default(""),
  modelo: z.string().optional().default(""),
  precio_compra: z.coerce.number().optional().default(0),
  precio_venta: z.coerce.number().optional().default(0),
  problemas: z.string().optional().default(""),
  observaciones: z.string().optional().default(""),
});

const CATEGORIAS_REP = ["modulo","placa_carga","bateria","porta_sim","flex","camara","tapa","placa_main","otro"] as const;
const RepuestoItemSchema = z.object({
  categoria: z.enum(CATEGORIAS_REP).optional().default("otro"),
  marca: z.string().optional().default(""),
  modelo_compatible: z.string().optional().default(""),
  precio_compra: z.coerce.number().optional().default(0),
  precio_venta: z.coerce.number().optional().default(0),
  stock: z.coerce.number().int().optional().default(1),
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

function toItemsArray(raw: any): any[] {
  if (!raw) return [];
  if (Array.isArray(raw.items)) return raw.items;
  if (Array.isArray(raw)) return raw;
  // single object fallback (legacy shape)
  return [raw];
}

export const interpretarVoz = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => VozInputSchema.parse(input))
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Falta LOVABLE_API_KEY");
    const { createLovableAiGatewayProvider } = await import("./ai-gateway.server");
    const gateway = createLovableAiGatewayProvider(key);
    const instruction =
      "Extraé datos de UNO O MÁS celulares usados a partir de voz o texto en español rioplatense. Los precios pueden venir como '200 mil', '200000', '200k', '1,5 millones'. Convertilos a número entero. Marcas comunes: Samsung, Apple/iPhone, Motorola, Xiaomi, Huawei, LG.\n\nRespondé SOLO con JSON válido: { \"transcripcion\": string, \"items\": [ { \"marca\": string, \"modelo\": string, \"precio_compra\": number, \"precio_venta\": number, \"problemas\": string, \"observaciones\": string } ] }.\n\nSi el usuario menciona varias unidades del mismo modelo (ej: '2 A32'), creá N entradas duplicadas (cada celular es único). Si menciona varios modelos distintos, creá una entrada por modelo. Si falta un dato, usá string vacío o 0. Sin texto adicional, sin markdown.";

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
      const raw: any = extractJSON(text);
      const items = toItemsArray(raw).map((it) => CelItemSchema.parse(it)).filter((it) => it.marca || it.modelo);
      return { transcripcion: raw?.transcripcion ?? data.texto ?? "", items };
    } catch {
      return { transcripcion: data.texto || text, items: [] as Array<z.infer<typeof CelItemSchema>> };
    }
  });

export const interpretarVozRepuesto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => VozInputSchema.parse(input))
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Falta LOVABLE_API_KEY");
    const { createLovableAiGatewayProvider } = await import("./ai-gateway.server");
    const gateway = createLovableAiGatewayProvider(key);
    const instruction =
      "Extraé datos de UNO O MÁS REPUESTOS de celular a partir de voz o texto en español rioplatense. Devolvé SOLO JSON: { \"transcripcion\": string, \"items\": [ { \"categoria\": (modulo|placa_carga|bateria|porta_sim|flex|camara|tapa|placa_main|otro), \"marca\": string, \"modelo_compatible\": string, \"precio_compra\": number, \"precio_venta\": number, \"stock\": number, \"observaciones\": string } ] }.\n\nIMPORTANTE: si el usuario menciona varios repuestos distintos (ej: 'compré módulo de A11 y 2 de A32'), creá una entrada por cada combinación distinta de categoría+modelo. La cantidad va en 'stock' (ej: '2 de A32' => stock 2). Si solo dice 'un módulo' => stock 1.\n\nMapeo de categoría desde el habla coloquial: 'módulo'/'pantalla'/'display' => modulo; 'pin de carga'/'placa de carga'/'conector de carga' => placa_carga; 'batería'/'pila' => bateria; 'porta sim'/'bandeja sim'/'lector sim' => porta_sim; 'flex'/'flex de power'/'flex de volumen' => flex; 'cámara'/'lente' => camara; 'tapa'/'tapa trasera'/'tapa de batería' => tapa; 'placa main'/'placa madre'/'lógica'/'mother' => placa_main. Si no entra en ninguna, usá 'otro'.\n\nPrecios como '15 mil'/'15000'/'15k' => entero. Si falta un dato, string vacío o 0. Sin texto adicional, sin markdown.";

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
      const raw: any = extractJSON(text);
      const items = toItemsArray(raw).map((it) => RepuestoItemSchema.parse(it)).filter((it) => it.marca || it.modelo_compatible || it.categoria !== "otro");
      return { transcripcion: raw?.transcripcion ?? data.texto ?? "", items };
    } catch {
      return { transcripcion: data.texto || text, items: [] as Array<z.infer<typeof RepuestoItemSchema>> };
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
    const { createLovableAiGatewayProvider } = await import("./ai-gateway.server");
    const gateway = createLovableAiGatewayProvider(key);
    const { text } = await generateText({
      model: gateway("google/gemini-3-flash-preview"),
      system:
        "Sos un asistente de inventario de celulares usados. Respondés en español, breve y directo. Usás SOLO los datos del inventario que te paso en JSON. Si no hay datos suficientes, decilo.",
      prompt: `Inventario actual (JSON):\n${JSON.stringify(rows)}\n\nPregunta: ${data.pregunta}`,
    });
    return { respuesta: text };
  });
