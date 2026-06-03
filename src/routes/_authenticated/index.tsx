import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listCelulares } from "@/lib/celulares.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Smartphone, CheckCircle2, DollarSign, TrendingUp, PackageX } from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from "recharts";

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
  const meses: { mes: string; ventas: number; ganancia: number }[] = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = d.toLocaleDateString("es-AR", { month: "short", year: "2-digit" });
    const inMonth = items.filter((c) => {
      if (!c.vendido || !c.fecha_venta) return false;
      const dv = new Date(c.fecha_venta);
      return dv.getFullYear() === d.getFullYear() && dv.getMonth() === d.getMonth();
    });
    meses.push({
      mes: key,
      ventas: inMonth.length,
      ganancia: inMonth.reduce((a, c) => a + (Number(c.precio_venta || 0) - Number(c.precio_compra || 0)), 0),
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

  const pieColors = ["hsl(var(--primary))", "#60a5fa", "#34d399", "#fbbf24", "#f87171", "#a78bfa"];

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
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={meses}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="mes" className="text-xs" />
                <YAxis yAxisId="left" className="text-xs" />
                <YAxis yAxisId="right" orientation="right" className="text-xs"
                  tickFormatter={(v) => `$${Math.round(v / 1000)}k`} />
                <Tooltip formatter={(v: any, name) => name === "ganancia" ? fmt(Number(v)) : v} />
                <Legend />
                <Bar yAxisId="left" dataKey="ventas" name="Ventas" fill="hsl(var(--primary))" radius={[4,4,0,0]} />
                <Bar yAxisId="right" dataKey="ganancia" name="Ganancia" fill="#34d399" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Por marca</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            {porMarca.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin datos.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={porMarca} dataKey="value" nameKey="name" outerRadius={80} label>
                    {porMarca.map((_, i) => (
                      <Cell key={i} fill={pieColors[i % pieColors.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
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
