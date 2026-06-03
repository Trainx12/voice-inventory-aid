import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listCelulares } from "@/lib/celulares.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Smartphone, CheckCircle2, DollarSign, TrendingUp, PackageX } from "lucide-react";

export const Route = createFileRoute("/_authenticated/")({
  component: Dashboard,
});

const fmt = (n: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n || 0);

function Dashboard() {
  const fetcher = useServerFn(listCelulares);
  const { data, isLoading } = useQuery({ queryKey: ["celulares"], queryFn: () => fetcher() });
  const items = data ?? [];

  const total = items.length;
  const vendidos = items.filter((c) => c.vendido).length;
  const disponibles = total - vendidos;
  const invertido = items.reduce((a, c) => a + Number(c.precio_compra || 0), 0);
  const potencial = items.filter((c) => !c.vendido).reduce((a, c) => a + Number(c.precio_venta || 0), 0);
  const ultimos = items.slice(0, 5);

  return (
    <div className="space-y-6 max-w-7xl">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground text-sm">Resumen de tu inventario</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <Stat icon={<Smartphone className="h-4 w-4" />} label="Total" value={total} loading={isLoading} />
        <Stat icon={<CheckCircle2 className="h-4 w-4 text-green-600" />} label="Disponibles" value={disponibles} loading={isLoading} />
        <Stat icon={<PackageX className="h-4 w-4 text-orange-600" />} label="Vendidos" value={vendidos} loading={isLoading} />
        <Stat icon={<DollarSign className="h-4 w-4 text-blue-600" />} label="Invertido" value={fmt(invertido)} loading={isLoading} />
        <Stat icon={<TrendingUp className="h-4 w-4 text-emerald-600" />} label="Valor potencial" value={fmt(potencial)} loading={isLoading} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Últimos cargados</CardTitle>
        </CardHeader>
        <CardContent>
          {ultimos.length === 0 ? (
            <p className="text-sm text-muted-foreground">Todavía no cargaste celulares.</p>
          ) : (
            <div className="divide-y">
              {ultimos.map((c) => (
                <div key={c.id} className="py-3 flex items-center justify-between gap-4">
                  <div>
                    <p className="font-medium">{c.marca} {c.modelo}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(c.fecha_creacion).toLocaleDateString("es-AR")} · {c.estado}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">{fmt(Number(c.precio_compra))}</p>
                    {c.vendido && <span className="text-xs text-orange-600">Vendido</span>}
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

function Stat({ icon, label, value, loading }: { icon: React.ReactNode; label: string; value: React.ReactNode; loading: boolean }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-xs font-medium text-muted-foreground">{label}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-xl md:text-2xl font-bold">{loading ? "…" : value}</div>
      </CardContent>
    </Card>
  );
}
