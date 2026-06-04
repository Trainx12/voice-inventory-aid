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

  // Ganancia realizada (vendidos)
  const ganancia = items
    .filter((c) => c.vendido)
    .reduce((a, c) => a + (Number(c.precio_venta || 0) - Number(c.precio_compra || 0)), 0);

  // Ventas por mes (últimos 6 meses)
  const BRAND_COLORS: Record<string, string> = {
    iphone: "#a3a3a3",     // Apple silver
    samsung: "#1428a0",    // Samsung blue
    motorola: "#e60023",   // Motorola red
    xiaomi: "#ff6900",     // Xiaomi orange
    otras: "#111111",
  };
  const BRAND_LABELS: Record<string, string> = {
    iphone: "iPhone", samsung: "Samsung", motorola: "Motorola", xiaomi: "Xiaomi", otras: "Otras",
  };
  const brandKey = (raw: string) => {
    const m = (raw || "").toLowerCase();
    if (m.includes("iphone") || m.includes("apple")) return "iphone";
    if (m.includes("samsung")) return "samsung";
    if (m.includes("motorola") || m.includes("moto ")) return "motorola";
    if (m.includes("xiaomi") || m.includes("redmi") || m.includes("poco")) return "xiaomi";
    return "otras";
  };
  const BRAND_KEYS = ["iphone", "samsung", "motorola", "xiaomi", "otras"] as const;

  type MesData = { mes: string; ventasPorMarca: Record<string, number>; gananciaPorMarca: Record<string, number>; ventasTotal: number; gananciaTotal: number };
  const meses: MesData[] = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = d.toLocaleDateString("es-AR", { month: "short", year: "2-digit" });
    const inMonth = items.filter((c) => {
      if (!c.vendido || !c.fecha_venta) return false;
      const dv = new Date(c.fecha_venta);
      return dv.getFullYear() === d.getFullYear() && dv.getMonth() === d.getMonth();
    });
    const ventasPorMarca: Record<string, number> = {};
    const gananciaPorMarca: Record<string, number> = {};
    for (const k of BRAND_KEYS) { ventasPorMarca[k] = 0; gananciaPorMarca[k] = 0; }
    for (const c of inMonth) {
      const k = brandKey(c.marca);
      ventasPorMarca[k] += 1;
      gananciaPorMarca[k] += Number(c.precio_venta || 0) - Number(c.precio_compra || 0);
    }
    meses.push({
      mes: key, ventasPorMarca, gananciaPorMarca,
      ventasTotal: inMonth.length,
      gananciaTotal: inMonth.reduce((a, c) => a + (Number(c.precio_venta || 0) - Number(c.precio_compra || 0)), 0),
    });
  }

  // Distribución por marca (top 6)
  const porMarca = Object.entries(
    items.reduce<Record<string, number>>((acc, c) => {
      const k = (c.marca || "Sin marca").trim();
      acc[k] = (acc[k] ?? 0) + 1;
      return acc;
    }, {}),
  )
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  const maxGanancia = Math.max(...meses.map((m) => m.gananciaTotal), 1);
  const maxVentas = Math.max(...meses.map((m) => m.ventasTotal), 1);
  const maxMarca = Math.max(...porMarca.map((m) => m.value), 1);

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
        <Stat icon={<TrendingUp className="h-4 w-4 text-emerald-600" />} label="Ganancia" value={fmt(ganancia)} loading={isLoading} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Ventas y ganancia · últimos 6 meses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex h-64 items-end gap-3 border-b border-l px-3 pt-4">
              {meses.map((m) => (
                <div key={m.mes} className="flex min-w-0 flex-1 flex-col items-center gap-2">
                  <div className="flex h-44 w-full items-end justify-center gap-1">
                    {/* Stacked ventas por marca */}
                    <div className="w-5 flex flex-col-reverse rounded-t overflow-hidden" title={`${m.ventasTotal} ventas`} style={{ height: `${Math.max(4, (m.ventasTotal / maxVentas) * 100)}%` }}>
                      {BRAND_KEYS.map((k) => m.ventasPorMarca[k] > 0 && (
                        <div key={k} style={{ background: BRAND_COLORS[k], flex: m.ventasPorMarca[k] }} title={`${BRAND_LABELS[k]}: ${m.ventasPorMarca[k]}`} />
                      ))}
                    </div>
                    {/* Stacked ganancia por marca */}
                    <div className="w-5 flex flex-col-reverse rounded-t overflow-hidden opacity-80" title={fmt(m.gananciaTotal)} style={{ height: `${Math.max(4, (Math.max(0, m.gananciaTotal) / maxGanancia) * 100)}%` }}>
                      {BRAND_KEYS.map((k) => m.gananciaPorMarca[k] > 0 && (
                        <div key={k} style={{ background: BRAND_COLORS[k], flex: m.gananciaPorMarca[k] }} title={`${BRAND_LABELS[k]}: ${fmt(m.gananciaPorMarca[k])}`} />
                      ))}
                    </div>
                  </div>
                  <span className="truncate text-xs text-muted-foreground">{m.mes}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              {BRAND_KEYS.map((k) => (
                <span key={k} className="inline-flex items-center gap-1">
                  <i className="h-2 w-2 rounded-full" style={{ background: BRAND_COLORS[k] }} />
                  {BRAND_LABELS[k]}
                </span>
              ))}
              <span className="ml-auto">Barra izq: ventas · der: ganancia</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Por marca</CardTitle>
          </CardHeader>
          <CardContent>
            {porMarca.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin datos.</p>
            ) : (
              <div className="space-y-4">
                {porMarca.map((m) => (
                  <div key={m.name} className="space-y-1.5">
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="truncate font-medium">{m.name}</span>
                      <span className="text-muted-foreground">{m.value}</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted">
                      <div className="h-2 rounded-full bg-primary" style={{ width: `${(m.value / maxMarca) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="text-xs text-muted-foreground">Valor potencial en stock: {fmt(potencial)}</div>

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
