import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listHistorial } from "@/lib/celulares.functions";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/historial")({
  component: HistorialPage,
});

const accionLabel: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  insert: { label: "Alta", variant: "default" },
  update: { label: "Modificación", variant: "secondary" },
  soft_delete: { label: "A papelera", variant: "outline" },
  restore: { label: "Restaurado", variant: "secondary" },
  delete: { label: "Eliminado", variant: "destructive" },
};

function HistorialPage() {
  const list = useServerFn(listHistorial);
  const { data, isLoading } = useQuery({ queryKey: ["historial"], queryFn: () => list() });
  const items = data ?? [];

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Historial de cambios</h1>
        <p className="text-muted-foreground text-sm">Últimas {items.length} acciones sobre el inventario</p>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <p className="p-6 text-muted-foreground">Cargando...</p>
          ) : items.length === 0 ? (
            <p className="p-6 text-muted-foreground">Todavía no hay cambios registrados.</p>
          ) : (
            <div className="divide-y">
              {items.map((h) => {
                const a = accionLabel[h.accion] ?? { label: h.accion, variant: "outline" as const };
                const diff = h.diff as Record<string, unknown> | null;
                const titulo =
                  h.accion === "insert" && diff && typeof diff === "object"
                    ? `${(diff as any).marca ?? ""} ${(diff as any).modelo ?? ""}`.trim()
                    : null;
                return (
                  <div key={h.id} className="p-4 space-y-1">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <Badge variant={a.variant}>{a.label}</Badge>
                        {titulo && <span className="font-medium">{titulo}</span>}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(h.fecha).toLocaleString("es-AR")}
                      </span>
                    </div>
                    {h.accion === "update" && diff && (
                      <ul className="text-xs text-muted-foreground pl-1 space-y-0.5">
                        {Object.entries(diff as Record<string, { old: unknown; new: unknown }>).map(([k, v]) => (
                          <li key={k}>
                            <span className="font-medium text-foreground">{k}:</span>{" "}
                            {String(v.old ?? "—")} → {String(v.new ?? "—")}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}