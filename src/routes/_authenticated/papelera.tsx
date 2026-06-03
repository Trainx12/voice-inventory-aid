import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  listPapelera,
  restaurarCelular,
  eliminarDefinitivo,
  getMyRole,
} from "@/lib/celulares.functions";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/_authenticated/papelera")({
  component: PapeleraPage,
});

function PapeleraPage() {
  const list = useServerFn(listPapelera);
  const restore = useServerFn(restaurarCelular);
  const hardDel = useServerFn(eliminarDefinitivo);
  const role = useServerFn(getMyRole);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({ queryKey: ["papelera"], queryFn: () => list() });
  const { data: roleData } = useQuery({ queryKey: ["my-role"], queryFn: () => role() });
  const isAdmin = roleData?.isAdmin ?? false;

  const items = data ?? [];

  const onRestore = async (id: string) => {
    try {
      await restore({ data: { id } });
      qc.invalidateQueries({ queryKey: ["papelera"] });
      qc.invalidateQueries({ queryKey: ["celulares"] });
      toast.success("Restaurado");
    } catch (e: any) { toast.error(e.message); }
  };
  const onHardDelete = async (id: string) => {
    try {
      await hardDel({ data: { id } });
      qc.invalidateQueries({ queryKey: ["papelera"] });
      toast.success("Eliminado definitivamente");
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Papelera</h1>
        <p className="text-muted-foreground text-sm">
          {items.length} celular{items.length === 1 ? "" : "es"} en papelera
          {!isAdmin && " · La eliminación definitiva la hace un administrador"}
        </p>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <p className="p-6 text-muted-foreground">Cargando...</p>
          ) : items.length === 0 ? (
            <p className="p-6 text-muted-foreground">La papelera está vacía.</p>
          ) : (
            <div className="divide-y">
              {items.map((c) => (
                <div key={c.id} className="p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div>
                    <p className="font-medium">{c.marca} {c.modelo}</p>
                    <p className="text-xs text-muted-foreground">
                      Eliminado el {c.fecha_eliminacion ? new Date(c.fecha_eliminacion).toLocaleString("es-AR") : "—"}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => onRestore(c.id)}>
                      <RotateCcw className="h-3.5 w-3.5 mr-1" /> Restaurar
                    </Button>
                    {isAdmin && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="destructive">
                            <Trash2 className="h-3.5 w-3.5 mr-1" /> Eliminar definitivo
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>¿Eliminar para siempre?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta acción no se puede deshacer. Se borra el celular y su historial.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => onHardDelete(c.id)}>Eliminar</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}