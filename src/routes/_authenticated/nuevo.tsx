import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CelularForm, type CelularInitial } from "@/components/celulares/CelularForm";
import { VoiceCapture } from "@/components/celulares/VoiceCapture";
import { useNavigate } from "@tanstack/react-router";
import { CsvImport } from "@/components/celulares/CsvImport";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { bulkInsertCelulares } from "@/lib/celulares.functions";
import { toast } from "sonner";

const CEL_CSV_TEMPLATE =
  "marca,modelo,imei,precio_compra,precio_venta,estado,problemas,observaciones,fecha_compra\nSamsung,A54,,200000,260000,disponible,,,2026-01-15\n";

export const Route = createFileRoute("/_authenticated/nuevo")({
  component: NuevoPage,
});

function NuevoPage() {
  const [initial, setInitial] = useState<CelularInitial | undefined>();
  const [tab, setTab] = useState("voz");
  const navigate = useNavigate();
  const qc = useQueryClient();
  const bulk = useServerFn(bulkInsertCelulares);
  const bulkMut = useMutation({
    mutationFn: (items: any[]) => bulk({ data: { items } }),
    onSuccess: (r) => {
      toast.success(`${r.count} celulares importados`);
      qc.invalidateQueries({ queryKey: ["celulares"] });
      navigate({ to: "/inventario" });
    },
    onError: (e: any) => toast.error(e.message || "Error al importar"),
  });

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Nuevo celular</h1>
          <p className="text-muted-foreground text-sm">Cargá por voz con IA, manualmente o por CSV</p>
        </div>
        <CsvImport
          label="Importar CSV"
          templateName="celulares-plantilla.csv"
          template={CEL_CSV_TEMPLATE}
          disabled={bulkMut.isPending}
          onParsed={(rows) =>
            bulkMut.mutateAsync(
              rows.map((r) => ({
                marca: r.marca,
                modelo: r.modelo,
                imei: r.imei || null,
                precio_compra: Number(r.precio_compra || 0),
                precio_venta: Number(r.precio_venta || 0),
                estado: r.estado || "disponible",
                problemas: r.problemas || null,
                observaciones: r.observaciones || null,
                fecha_compra: r.fecha_compra || new Date().toISOString().slice(0, 10),
              })),
            )
          }
        />
      </div>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="voz">🎙️ Por voz</TabsTrigger>
          <TabsTrigger value="manual">✍️ Manual</TabsTrigger>
        </TabsList>
        <TabsContent value="voz" className="space-y-6">
          <VoiceCapture
            onParsed={(items) => {
              if (items.length === 0) return;
              if (items.length > 1) {
                bulkMut.mutate(
                  items.map((p) => ({
                    marca: p.marca || "Sin marca",
                    modelo: p.modelo || "Sin modelo",
                    precio_compra: Number(p.precio_compra) || 0,
                    precio_venta: Number(p.precio_venta) || 0,
                    estado: "disponible",
                    problemas: p.problemas || null,
                    observaciones: p.observaciones || null,
                    fecha_compra: new Date().toISOString().slice(0, 10),
                  })),
                );
                return;
              }
              const p = items[0];
              setInitial({
                marca: p.marca, modelo: p.modelo,
                precio_compra: p.precio_compra,
                problemas: p.problemas, observaciones: p.observaciones,
              });
              setTab("manual");
            }}
          />
          <p className="text-sm text-muted-foreground text-center">
            Si mencionás varios equipos en un solo audio, se cargan todos juntos. Para uno solo, podés ajustar los datos antes de guardar.
          </p>
        </TabsContent>
        <TabsContent value="manual">
          <CelularForm initial={initial} onSaved={() => navigate({ to: "/inventario" })} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
