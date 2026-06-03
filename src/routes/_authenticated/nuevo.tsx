import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CelularForm, type CelularInitial } from "@/components/celulares/CelularForm";
import { VoiceCapture } from "@/components/celulares/VoiceCapture";
import { useNavigate } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/nuevo")({
  component: NuevoPage,
});

function NuevoPage() {
  const [initial, setInitial] = useState<CelularInitial | undefined>();
  const [tab, setTab] = useState("voz");
  const navigate = useNavigate();

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Nuevo celular</h1>
        <p className="text-muted-foreground text-sm">Cargá por voz con IA o manualmente</p>
      </div>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="voz">🎙️ Por voz</TabsTrigger>
          <TabsTrigger value="manual">✍️ Manual</TabsTrigger>
        </TabsList>
        <TabsContent value="voz" className="space-y-6">
          <VoiceCapture
            onParsed={(p) => {
              setInitial({
                marca: p.marca, modelo: p.modelo,
                precio_compra: p.precio_compra,
                problemas: p.problemas, observaciones: p.observaciones,
              });
              setTab("manual");
            }}
          />
          <p className="text-sm text-muted-foreground text-center">
            Después de interpretar podés ajustar los datos antes de guardar.
          </p>
        </TabsContent>
        <TabsContent value="manual">
          <CelularForm initial={initial} onSaved={() => navigate({ to: "/inventario" })} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
