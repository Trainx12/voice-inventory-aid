import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Minus, Trash2 } from "lucide-react";
import { VoiceCapture } from "@/components/celulares/VoiceCapture";
import { ajustarStock, CATEGORIAS, eliminarRepuesto, listRepuestos, upsertRepuesto } from "@/lib/repuestos.functions";

export const Route = createFileRoute("/_authenticated/repuestos")({
  component: RepuestosPage,
});

const LABELS: Record<string, string> = {
  modulo: "Módulos",
  placa_carga: "Placa de Carga",
  bateria: "Batería",
  porta_sim: "Porta Sim",
  flex: "Flex",
  camara: "Cámara",
  tapa: "Tapas",
  placa_main: "Placa Main",
  otro: "Otros",
};

const fmt = (n: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n || 0);

type FormState = {
  id?: string;
  categoria: (typeof CATEGORIAS)[number];
  marca: string;
  modelo_compatible: string;
  precio_compra: number;
  precio_venta: number;
  stock: number;
  observaciones: string;
};

const empty: FormState = {
  categoria: "modulo", marca: "", modelo_compatible: "",
  precio_compra: 0, precio_venta: 0, stock: 1, observaciones: "",
};

function RepuestosPage() {
  const qc = useQueryClient();
  const list = useServerFn(listRepuestos);
  const save = useServerFn(upsertRepuesto);
  const del = useServerFn(eliminarRepuesto);
  const adjust = useServerFn(ajustarStock);
  const { data, isLoading } = useQuery({ queryKey: ["repuestos"], queryFn: () => list() });
  const items = data ?? [];

  const [form, setForm] = useState<FormState>(empty);
  const [showForm, setShowForm] = useState(false);

  const saveMut = useMutation({
    mutationFn: (f: FormState) => save({ data: f }),
    onSuccess: () => {
      toast.success(form.id ? "Repuesto actualizado" : "Repuesto agregado");
      setForm(empty); setShowForm(false);
      qc.invalidateQueries({ queryKey: ["repuestos"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Error al guardar"),
  });
  const delMut = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => { toast.success("Eliminado"); qc.invalidateQueries({ queryKey: ["repuestos"] }); },
  });
  const adjMut = useMutation({
    mutationFn: (v: { id: string; delta: number }) => adjust({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["repuestos"] }),
  });

  const grouped = CATEGORIAS.map((c) => ({ cat: c, items: items.filter((r) => r.categoria === c) }));

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Repuestos</h1>
          <p className="text-muted-foreground text-sm">Inventario por categoría · podés cargar por voz</p>
        </div>
        <Button onClick={() => { setForm(empty); setShowForm((s) => !s); }}>
          <Plus className="h-4 w-4 mr-2" />{showForm ? "Cerrar" : "Nuevo repuesto"}
        </Button>
      </div>

      {showForm && (
        <div className="grid gap-4 md:grid-cols-2">
          <VoiceCapture
            mode="repuesto"
            onParsed={(p) => {
              setForm((f) => ({
                ...f,
                categoria: (CATEGORIAS as readonly string[]).includes(p.categoria) ? p.categoria : f.categoria,
                marca: p.marca || f.marca,
                modelo_compatible: p.modelo_compatible || f.modelo_compatible,
                precio_compra: Number(p.precio_compra) || f.precio_compra,
                precio_venta: Number(p.precio_venta) || f.precio_venta,
                stock: Number(p.stock) || f.stock || 1,
                observaciones: p.observaciones || f.observaciones,
              }));
            }}
          />
          <Card>
            <CardHeader><CardTitle className="text-base">Datos del repuesto</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label>Categoría</Label>
                <Select value={form.categoria} onValueChange={(v) => setForm({ ...form, categoria: v as any })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIAS.map((c) => <SelectItem key={c} value={c}>{LABELS[c]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Marca</Label><Input value={form.marca} onChange={(e) => setForm({ ...form, marca: e.target.value })} /></div>
                <div><Label>Modelo compatible</Label><Input value={form.modelo_compatible} onChange={(e) => setForm({ ...form, modelo_compatible: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div><Label>P. compra</Label><Input type="number" value={form.precio_compra} onChange={(e) => setForm({ ...form, precio_compra: Number(e.target.value) })} /></div>
                <div><Label>P. venta</Label><Input type="number" value={form.precio_venta} onChange={(e) => setForm({ ...form, precio_venta: Number(e.target.value) })} /></div>
                <div><Label>Stock</Label><Input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: Number(e.target.value) })} /></div>
              </div>
              <div>
                <Label>Observaciones</Label>
                <Textarea value={form.observaciones} onChange={(e) => setForm({ ...form, observaciones: e.target.value })} rows={2} />
              </div>
              <Button className="w-full" disabled={saveMut.isPending} onClick={() => saveMut.mutate(form)}>
                {saveMut.isPending ? "Guardando..." : "Guardar repuesto"}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando…</p>
      ) : (
        <div className="space-y-4">
          {grouped.map(({ cat, items }) => (
            <Card key={cat}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-base">{LABELS[cat]}</CardTitle>
                <Badge variant="secondary">{items.reduce((a, r) => a + (r.stock || 0), 0)} en stock</Badge>
              </CardHeader>
              <CardContent>
                {items.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sin repuestos en esta categoría.</p>
                ) : (
                  <div className="divide-y">
                    {items.map((r) => (
                      <div key={r.id} className="py-3 flex flex-wrap items-center gap-3 justify-between">
                        <div className="min-w-0">
                          <p className="font-medium truncate">{r.marca || "Sin marca"} · {r.modelo_compatible || "—"}</p>
                          <p className="text-xs text-muted-foreground">
                            Compra {fmt(Number(r.precio_compra))} · Venta {fmt(Number(r.precio_venta))}
                          </p>
                          {r.observaciones && <p className="text-xs text-muted-foreground truncate">{r.observaciones}</p>}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button size="icon" variant="outline" onClick={() => adjMut.mutate({ id: r.id, delta: -1 })}><Minus className="h-4 w-4" /></Button>
                          <span className="w-8 text-center font-semibold">{r.stock}</span>
                          <Button size="icon" variant="outline" onClick={() => adjMut.mutate({ id: r.id, delta: 1 })}><Plus className="h-4 w-4" /></Button>
                          <Button size="icon" variant="ghost" onClick={() => { if (confirm("¿Eliminar este repuesto?")) delMut.mutate(r.id); }}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}