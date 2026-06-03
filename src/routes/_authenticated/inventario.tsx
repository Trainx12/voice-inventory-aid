import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listCelulares, marcarVendido, eliminarCelular, getMyRole } from "@/lib/celulares.functions";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { CheckCircle2, RotateCcw, Trash2, Search } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/_authenticated/inventario")({
  component: InventarioPage,
});

const fmt = (n: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n || 0);

function InventarioPage() {
  const list = useServerFn(listCelulares);
  const sell = useServerFn(marcarVendido);
  const del = useServerFn(eliminarCelular);
  const role = useServerFn(getMyRole);
  const qc = useQueryClient();
  const [q, setQ] = useState("");

  const { data, isLoading } = useQuery({ queryKey: ["celulares"], queryFn: () => list() });
  const { data: roleData } = useQuery({ queryKey: ["my-role"], queryFn: () => role() });
  const isAdmin = roleData?.isAdmin ?? false;

  const items = (data ?? []).filter((c) => {
    if (!q.trim()) return true;
    const s = q.toLowerCase();
    return [c.marca, c.modelo, c.estado, c.problemas, c.observaciones]
      .filter(Boolean).some((v) => String(v).toLowerCase().includes(s));
  });

  const toggleSell = async (id: string, vendido: boolean) => {
    try {
      await sell({ data: { id, vendido: !vendido } });
      qc.invalidateQueries({ queryKey: ["celulares"] });
    } catch (e: any) { toast.error(e.message); }
  };
  const remove = async (id: string) => {
    try {
      await del({ data: { id } });
      qc.invalidateQueries({ queryKey: ["celulares"] });
      toast.success("Eliminado");
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Inventario</h1>
          <p className="text-muted-foreground text-sm">{items.length} de {data?.length ?? 0} celulares</p>
        </div>
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Buscar marca, modelo..." value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <p className="p-6 text-muted-foreground">Cargando...</p>
          ) : items.length === 0 ? (
            <p className="p-6 text-muted-foreground">Sin resultados.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left">
                  <tr>
                    <th className="p-3">Equipo</th>
                    <th className="p-3 hidden md:table-cell">Estado</th>
                    <th className="p-3 hidden md:table-cell">Compra</th>
                    <th className="p-3 hidden md:table-cell">Venta</th>
                    <th className="p-3 hidden lg:table-cell">Problemas</th>
                    <th className="p-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {items.map((c) => (
                    <tr key={c.id} className={c.vendido ? "opacity-60" : ""}>
                      <td className="p-3">
                        <div className="font-medium">{c.marca} {c.modelo}</div>
                        <div className="text-xs text-muted-foreground md:hidden">
                          {fmt(Number(c.precio_compra))} → {fmt(Number(c.precio_venta))}
                        </div>
                      </td>
                      <td className="p-3 hidden md:table-cell">
                        <Badge variant={c.vendido ? "secondary" : "default"}>{c.estado}</Badge>
                      </td>
                      <td className="p-3 hidden md:table-cell">{fmt(Number(c.precio_compra))}</td>
                      <td className="p-3 hidden md:table-cell">{fmt(Number(c.precio_venta))}</td>
                      <td className="p-3 hidden lg:table-cell max-w-xs truncate text-muted-foreground">{c.problemas || "-"}</td>
                      <td className="p-3 text-right space-x-1 whitespace-nowrap">
                        <Button size="sm" variant="outline" onClick={() => toggleSell(c.id, c.vendido)}>
                          {c.vendido ? <RotateCcw className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                        </Button>
                        {isAdmin && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="sm" variant="ghost"><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>¿Eliminar este celular?</AlertDialogTitle>
                                <AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => remove(c.id)}>Eliminar</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
