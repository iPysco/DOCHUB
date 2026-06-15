import { Link } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Building2,
  FileText,
  Users,
  Filter,
} from "lucide-react";
import type { ReactNode } from "react";
import { useStore } from "@/lib/store";

const navItems = [
  { to: "/", label: "Painel", icon: LayoutDashboard },
  { to: "/empresas", label: "Empresas", icon: Building2 },
  { to: "/tipos-documentos", label: "Tipos de Documentos", icon: FileText },
  { to: "/analistas", label: "Analistas", icon: Users },
] as const;

export function AppLayout({ children }: { children: ReactNode }) {
  const analistas = useStore((s) => s.analistas);
  const filtroId = useStore((s) => s.analistaFiltroId);
  const setFiltro = useStore((s) => s.setAnalistaFiltro);

  return (
    <div className="min-h-screen flex bg-background">
      <aside className="w-64 shrink-0 border-r border-sidebar-border bg-sidebar flex flex-col">
        <div className="px-6 py-6 border-b border-sidebar-border">
          <div className="flex items-center gap-2">
            <div className="size-9 rounded-lg bg-primary text-primary-foreground grid place-items-center font-bold">
              C
            </div>
            <div>
              <div className="font-semibold leading-tight">ContaDocs</div>
              <div className="text-xs text-muted-foreground">Gestão contábil</div>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                activeOptions={{ exact: item.to === "/" }}
                activeProps={{
                  className:
                    "bg-sidebar-accent text-sidebar-accent-foreground font-medium",
                }}
                className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
              >
                <Icon className="size-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-sidebar-border space-y-2">
          <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground px-1">
            <Filter className="size-3" /> Filtrar por analista
          </label>
          <select
            value={filtroId ?? ""}
            onChange={(e) => setFiltro(e.target.value || null)}
            className="w-full text-sm px-2 py-1.5 rounded-md border border-input bg-card"
          >
            <option value="">Todos analistas</option>
            {analistas.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nome}
              </option>
            ))}
          </select>
        </div>
      </aside>

      <main className="flex-1 min-w-0">{children}</main>
    </div>
  );
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="border-b border-border bg-card">
      <div className="px-8 py-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {description && (
            <p className="text-sm text-muted-foreground mt-1">{description}</p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}
