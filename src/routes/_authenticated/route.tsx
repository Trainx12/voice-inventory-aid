import { createFileRoute, Outlet, redirect, Link, useRouter } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";
import { LayoutDashboard, ListChecks, PlusCircle, MessageSquare, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AuthedLayout,
});

function AuthedLayout() {
  const router = useRouter();
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!session) router.navigate({ to: "/auth" });
    });
    return () => sub.subscription.unsubscribe();
  }, [router]);

  const signOut = async () => {
    await supabase.auth.signOut();
    router.navigate({ to: "/auth" });
  };

  return (
    <div className="min-h-screen flex bg-muted/30">
      <aside className="hidden md:flex w-60 flex-col border-r bg-card p-4 gap-1">
        <div className="px-2 py-3 mb-4">
          <h1 className="text-lg font-bold">📱 Celu Stock</h1>
          <p className="text-xs text-muted-foreground">Gestión de inventario</p>
        </div>
        <NavItem to="/" icon={<LayoutDashboard className="h-4 w-4" />}>Dashboard</NavItem>
        <NavItem to="/inventario" icon={<ListChecks className="h-4 w-4" />}>Inventario</NavItem>
        <NavItem to="/nuevo" icon={<PlusCircle className="h-4 w-4" />}>Nuevo celular</NavItem>
        <NavItem to="/asistente" icon={<MessageSquare className="h-4 w-4" />}>Asistente</NavItem>
        <div className="mt-auto">
          <Button variant="ghost" className="w-full justify-start" onClick={signOut}>
            <LogOut className="h-4 w-4 mr-2" /> Cerrar sesión
          </Button>
        </div>
      </aside>
      <main className="flex-1 min-w-0">
        <div className="md:hidden flex items-center justify-between p-4 border-b bg-card">
          <h1 className="font-bold">📱 Celu Stock</h1>
          <Button variant="ghost" size="sm" onClick={signOut}><LogOut className="h-4 w-4" /></Button>
        </div>
        <nav className="md:hidden flex gap-1 overflow-x-auto p-2 border-b bg-card">
          <MobileNav to="/">Dashboard</MobileNav>
          <MobileNav to="/inventario">Inventario</MobileNav>
          <MobileNav to="/nuevo">Nuevo</MobileNav>
          <MobileNav to="/asistente">Asistente</MobileNav>
        </nav>
        <div className="p-4 md:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

function NavItem({ to, icon, children }: { to: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      activeOptions={{ exact: to === "/" }}
      className="flex items-center gap-2 px-3 py-2 rounded-md text-sm hover:bg-accent transition-colors"
      activeProps={{ className: "bg-accent font-medium" }}
    >
      {icon} {children}
    </Link>
  );
}
function MobileNav({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      activeOptions={{ exact: to === "/" }}
      className="px-3 py-1.5 rounded-md text-sm bg-muted whitespace-nowrap"
      activeProps={{ className: "bg-primary text-primary-foreground" }}
    >
      {children}
    </Link>
  );
}
