import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Mic, Square, Sparkles } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { interpretarVoz } from "@/lib/ai.functions";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";

type Parsed = { marca: string; modelo: string; precio_compra: number; problemas: string; observaciones: string };

export function VoiceCapture({ onParsed }: { onParsed: (p: Parsed) => void }) {
  const [recording, setRecording] = useState(false);
  const [texto, setTexto] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const recRef = useRef<any>(null);
  const interpret = useServerFn(interpretarVoz);

  const start = async () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { toast.error("Tu navegador no soporta reconocimiento de voz. Probá Chrome."); return; }
    // Forzar prompt de permiso del micrófono (necesario dentro de iframes de preview)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
    } catch (err: any) {
      toast.error("No se pudo acceder al micrófono. Permití el acceso en el navegador. " + (err?.message || ""));
      return;
    }
    const rec = new SR();
    rec.lang = "es-AR";
    rec.continuous = true;
    rec.interimResults = true;
    rec.onresult = (e: any) => {
      let t = "";
      for (let i = 0; i < e.results.length; i++) t += e.results[i][0].transcript;
      setTexto(t);
    };
    rec.onend = () => setRecording(false);
    rec.onerror = (e: any) => {
      const map: Record<string, string> = {
        "not-allowed": "Permiso de micrófono denegado",
        "service-not-allowed": "El navegador bloqueó el reconocimiento de voz",
        "no-speech": "No detecté voz, probá de nuevo",
        "audio-capture": "No se encontró micrófono",
        "network": "Error de red en el reconocimiento de voz",
      };
      toast.error(map[e.error] || ("Error: " + e.error));
      setRecording(false);
    };
    recRef.current = rec;
    try {
      rec.start();
      setRecording(true);
    } catch (err: any) {
      toast.error("No se pudo iniciar la grabación: " + (err?.message || ""));
    }
  };
  const stop = () => recRef.current?.stop();

  const analyze = async () => {
    if (!texto.trim()) return;
    setAnalyzing(true);
    try {
      const out = await interpret({ data: { texto } });
      onParsed(out as Parsed);
      toast.success("Datos extraídos");
    } catch (err: any) {
      toast.error(err.message || "Error de IA");
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        <div className="flex flex-col items-center gap-3">
          {!recording ? (
            <Button type="button" size="lg" className="h-20 w-20 rounded-full" onClick={start}>
              <Mic className="h-8 w-8" />
            </Button>
          ) : (
            <Button type="button" size="lg" variant="destructive" className="h-20 w-20 rounded-full animate-pulse" onClick={stop}>
              <Square className="h-8 w-8" />
            </Button>
          )}
          <p className="text-sm text-muted-foreground text-center">
            {recording ? "Grabando... hablá libremente" : "Presioná para grabar"}
          </p>
        </div>
        <Textarea
          placeholder='Ej: "Compré un Samsung A54 a 200 mil pesos y tiene la pantalla rota"'
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          rows={3}
        />
        <Button type="button" className="w-full" disabled={!texto.trim() || analyzing} onClick={analyze}>
          <Sparkles className="h-4 w-4 mr-2" />
          {analyzing ? "Analizando..." : "Interpretar con IA"}
        </Button>
      </CardContent>
    </Card>
  );
}
