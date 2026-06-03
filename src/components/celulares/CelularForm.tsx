import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useServerFn } from "@tanstack/react-start";
import { upsertCelular } from "@/lib/celulares.functions";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

export type CelularInitial = {
  marca?: string; modelo?: string; imei?: string;
  precio_compra?: number; precio_venta?: number; estado?: string;
  problemas?: string; observaciones?: string; fecha_compra?: string;
};

export function CelularForm({ initial, onSaved }: { initial?: CelularInitial; onSaved?: () => void }) {
  const save = useServerFn(upsertCelular);
  const qc = useQueryClient();
  const [f, setF] = useState({
    marca: initial?.marca ?? "",
    modelo: initial?.modelo ?? "",
    imei: initial?.imei ?? "",
    precio_compra: initial?.precio_compra ?? 0,
    precio_venta: initial?.precio_venta ?? 0,
    estado: initial?.estado ?? "disponible",
    problemas: initial?.problemas ?? "",
    observaciones: initial?.observaciones ?? "",
    fecha_compra: initial?.fecha_compra ?? new Date().toISOString().slice(0, 10),
  });
  const [files, setFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const paths: string[] = [];
      for (const file of files) {
        const path = `${crypto.randomUUID()}-${file.name}`;
        const { error } = await supabase.storage.from("celulares").upload(path, file);
        if (error) throw error;
        paths.push(path);
      }
      await save({ data: { ...f, imagenes: paths } });
      toast.success("Celular guardado");
      qc.invalidateQueries({ queryKey: ["celulares"] });
      onSaved?.();
      setF({ ...f, marca: "", modelo: "", imei: "", precio_compra: 0, precio_venta: 0, problemas: "", observaciones: "" });
      setFiles([]);
    } catch (err: any) {
      toast.error(err.message || "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Marca *"><Input required value={f.marca} onChange={(e) => setF({ ...f, marca: e.target.value })} /></Field>
        <Field label="Modelo *"><Input required value={f.modelo} onChange={(e) => setF({ ...f, modelo: e.target.value })} /></Field>
        <Field label="IMEI"><Input value={f.imei} onChange={(e) => setF({ ...f, imei: e.target.value })} /></Field>
        <Field label="Estado">
          <select className="flex h-9 w-full rounded-md border bg-transparent px-3 text-sm" value={f.estado} onChange={(e) => setF({ ...f, estado: e.target.value })}>
            <option value="disponible">Disponible</option>
            <option value="reparacion">En reparación</option>
            <option value="reservado">Reservado</option>
            <option value="vendido">Vendido</option>
          </select>
        </Field>
        <Field label="Precio compra"><Input type="number" min={0} value={f.precio_compra} onChange={(e) => setF({ ...f, precio_compra: Number(e.target.value) })} /></Field>
        <Field label="Precio venta estimado"><Input type="number" min={0} value={f.precio_venta} onChange={(e) => setF({ ...f, precio_venta: Number(e.target.value) })} /></Field>
        <Field label="Fecha de compra"><Input type="date" value={f.fecha_compra} onChange={(e) => setF({ ...f, fecha_compra: e.target.value })} /></Field>
      </div>
      <Field label="Problemas"><Textarea value={f.problemas} onChange={(e) => setF({ ...f, problemas: e.target.value })} /></Field>
      <Field label="Observaciones"><Textarea value={f.observaciones} onChange={(e) => setF({ ...f, observaciones: e.target.value })} /></Field>
      <Field label="Fotos">
        <Input type="file" multiple accept="image/*" onChange={(e) => setFiles(Array.from(e.target.files ?? []))} />
        {files.length > 0 && <p className="text-xs text-muted-foreground mt-1">{files.length} archivo(s)</p>}
      </Field>
      <Button type="submit" disabled={saving}>{saving ? "Guardando..." : "Guardar celular"}</Button>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm">{label}</Label>
      {children}
    </div>
  );
}
