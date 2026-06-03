import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useServerFn } from "@tanstack/react-start";
import { consultaAsistente } from "@/lib/ai.functions";
import { Mic, Send, Volume2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/asistente")({
  component: AsistentePage,
});

type Msg = { role: "user" | "assistant"; text: string };

function AsistentePage() {
  const ask = useServerFn(consultaAsistente);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const speak = (t: string) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    const u = new SpeechSynthesisUtterance(t);
    u.lang = "es-AR";
    window.speechSynthesis.speak(u);
  };

  const recordVoice = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { toast.error("Tu navegador no soporta voz"); return; }
    const rec = new SR();
    rec.lang = "es-AR";
    rec.onresult = (e: any) => setInput(e.results[0][0].transcript);
    rec.start();
  };

  const send = async (text?: string) => {
    const pregunta = (text ?? input).trim();
    if (!pregunta) return;
    setMsgs((m) => [...m, { role: "user", text: pregunta }]);
    setInput("");
    setLoading(true);
    try {
      const { respuesta } = await ask({ data: { pregunta } });
      setMsgs((m) => [...m, { role: "assistant", text: respuesta }]);
      speak(respuesta);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Asistente</h1>
        <p className="text-muted-foreground text-sm">Preguntá sobre tu inventario en lenguaje natural</p>
      </div>
      <Card className="min-h-[400px]">
        <CardContent className="p-4 space-y-3">
          {msgs.length === 0 && (
            <div className="text-sm text-muted-foreground space-y-2">
              <p>Ejemplos:</p>
              <ul className="list-disc pl-5">
                <li>¿Cuántos Samsung tengo en stock?</li>
                <li>Mostrame los celulares con pantalla rota</li>
                <li>¿Cuál es el valor total invertido?</li>
              </ul>
            </div>
          )}
          {msgs.map((m, i) => (
            <div key={i} className={m.role === "user" ? "text-right" : ""}>
              {m.role === "user" ? (
                <div className="inline-block bg-primary text-primary-foreground rounded-2xl px-4 py-2 text-sm max-w-[80%]">{m.text}</div>
              ) : (
                <div className="flex items-start gap-2">
                  <div className="text-sm whitespace-pre-wrap flex-1">{m.text}</div>
                  <Button size="icon" variant="ghost" onClick={() => speak(m.text)}><Volume2 className="h-4 w-4" /></Button>
                </div>
              )}
            </div>
          ))}
          {loading && <p className="text-sm text-muted-foreground">Pensando...</p>}
        </CardContent>
      </Card>
      <div className="flex gap-2">
        <Button variant="outline" size="icon" onClick={recordVoice}><Mic className="h-4 w-4" /></Button>
        <Input
          placeholder="Escribí o hablá..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
        />
        <Button onClick={() => send()} disabled={loading}><Send className="h-4 w-4" /></Button>
      </div>
    </div>
  );
}
