import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Mic, Square, Sparkles } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { interpretarVoz, interpretarVozRepuesto } from "@/lib/ai.functions";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";

type Parsed = Record<string, any> & { transcripcion?: string };

function arrayBufferToBase64(buffer: ArrayBuffer) {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

function encodeWav(audioBuffer: AudioBuffer) {
  const channels = Array.from({ length: audioBuffer.numberOfChannels }, (_, index) => audioBuffer.getChannelData(index));
  const sampleRate = audioBuffer.sampleRate;
  const samples = audioBuffer.length;
  const blockAlign = channels.length * 2;
  const buffer = new ArrayBuffer(44 + samples * blockAlign);
  const view = new DataView(buffer);
  const writeString = (offset: number, value: string) => {
    for (let i = 0; i < value.length; i++) view.setUint8(offset + i, value.charCodeAt(i));
  };

  writeString(0, "RIFF");
  view.setUint32(4, 36 + samples * blockAlign, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels.length, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);
  writeString(36, "data");
  view.setUint32(40, samples * blockAlign, true);

  let offset = 44;
  for (let i = 0; i < samples; i++) {
    for (const channel of channels) {
      const sample = Math.max(-1, Math.min(1, channel[i] ?? 0));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      offset += 2;
    }
  }
  return buffer;
}

async function audioBlobToWavBase64(blob: Blob) {
  const AudioContextCtor = window.AudioContext || (window as any).webkitAudioContext;
  const audioContext = new AudioContextCtor();
  try {
    const audioBuffer = await audioContext.decodeAudioData(await blob.arrayBuffer());
    return arrayBufferToBase64(encodeWav(audioBuffer));
  } finally {
    await audioContext.close?.();
  }
}

export function VoiceCapture({ onParsed, mode = "celular" }: { onParsed: (p: Parsed) => void; mode?: "celular" | "repuesto" }) {
  const [recording, setRecording] = useState(false);
  const [texto, setTexto] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [status, setStatus] = useState("Presioná para grabar");
  const recRef = useRef<any>(null);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const textoRef = useRef("");
  const interpretCel = useServerFn(interpretarVoz);
  const interpretRep = useServerFn(interpretarVozRepuesto);
  const interpret = mode === "repuesto" ? interpretRep : interpretCel;

  useEffect(() => () => streamRef.current?.getTracks().forEach((track) => track.stop()), []);

  const updateTexto = (value: string) => {
    textoRef.current = value;
    setTexto(value);
  };

  const analyze = async (audioBase64?: string) => {
    const textoActual = textoRef.current.trim();
    if (!textoActual && !audioBase64) return;
    setAnalyzing(true);
    setStatus("Interpretando con IA...");
    try {
      const out = await interpret({ data: { texto: textoActual, audioBase64, mediaType: "audio/wav" } });
      const parsed = out as Parsed;
      if (parsed.transcripcion?.trim()) updateTexto(parsed.transcripcion.trim());
      onParsed(parsed);
      toast.success("Datos extraídos");
      setStatus("Listo");
    } catch (err: any) {
      toast.error(err.message || "Error de IA");
      setStatus("No pude interpretar el audio");
    } finally {
      setAnalyzing(false);
    }
  };

  const start = async () => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      toast.error("Tu navegador no permite grabar audio. Probá Chrome.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      updateTexto("");

      const mimeType = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"].find((type) => MediaRecorder.isTypeSupported(type));
      const media = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      media.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      media.onstop = async () => {
        setRecording(false);
        setStatus("Procesando audio...");
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;

        const blob = new Blob(chunksRef.current, { type: media.mimeType || "audio/webm" });
        if (blob.size < 500) {
          setStatus("No detecté audio, probá de nuevo");
          return;
        }

        try {
          const audioBase64 = await audioBlobToWavBase64(blob);
          await analyze(audioBase64);
        } catch (err: any) {
          toast.error("No pude procesar el audio grabado. Probá escribir la frase en el cuadro.");
          setStatus("No pude procesar el audio");
        }
      };
      mediaRef.current = media;
      media.start();

      const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SR) {
        const rec = new SR();
        let finalTranscript = "";
        rec.lang = "es-AR";
        rec.continuous = true;
        rec.interimResults = true;
        rec.onresult = (e: any) => {
          let interim = "";
          for (let i = e.resultIndex; i < e.results.length; i++) {
            const transcript = e.results[i][0]?.transcript ?? "";
            if (e.results[i].isFinal) finalTranscript += `${transcript} `;
            else interim += transcript;
          }
          updateTexto(`${finalTranscript}${interim}`.trim());
        };
        rec.onerror = () => undefined;
        recRef.current = rec;
        try { rec.start(); } catch { recRef.current = null; }
      }

      setRecording(true);
      setStatus("Grabando... hablá libremente");
    } catch (err: any) {
      toast.error("No se pudo acceder al micrófono. Permití el acceso en el navegador. " + (err?.message || ""));
    }
  };
  const stop = () => {
    try { recRef.current?.stop?.(); } catch { /* el reconocimiento del navegador puede haberse cerrado solo */ }
    recRef.current = null;
    if (mediaRef.current?.state === "recording") mediaRef.current.stop();
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
            {status}
          </p>
        </div>
        <Textarea
          placeholder={
            mode === "repuesto"
              ? 'Ej: "Compré 3 módulos de Samsung A54 a 15 mil cada uno, los vendo a 25"'
              : 'Ej: "Compré un Samsung A54 a 200 mil pesos y tiene la pantalla rota"'
          }
          value={texto}
          onChange={(e) => updateTexto(e.target.value)}
          rows={3}
        />
        <Button type="button" className="w-full" disabled={(!texto.trim() && !recording) || analyzing || recording} onClick={() => analyze()}>
          <Sparkles className="h-4 w-4 mr-2" />
          {analyzing ? "Analizando..." : "Interpretar con IA"}
        </Button>
      </CardContent>
    </Card>
  );
}
