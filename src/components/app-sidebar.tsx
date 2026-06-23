import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, Building2, Users, BookOpen, FileText, BarChart3, ShieldCheck, Bell, History, Search, Network } from "lucide-react";
import { LOGO_URL } from "@/lib/logo";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

const COPYRIGHT_YEAR = 2026;

interface NavItem { to: string; label: string; icon: React.ComponentType<{ className?: string }>; roles?: ("main_admin" | "sub_admin" | "submitter")[]; }

const NAV: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/reports", label: "Reports", icon: FileText },
  { to: "/reports/new", label: "New Report", icon: BookOpen, roles: ["submitter", "main_admin", "sub_admin"] },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/compliance", label: "Compliance", icon: ShieldCheck },
  { to: "/churches", label: "Churches", icon: Building2, roles: ["main_admin", "sub_admin"] },
  { to: "/departments", label: "Departments", icon: Network, roles: ["main_admin", "sub_admin"] },
  { to: "/units", label: "Units", icon: Network, roles: ["main_admin", "sub_admin"] },
  { to: "/users", label: "Users", icon: Users, roles: ["main_admin"] },
  { to: "/notifications", label: "Notifications", icon: Bell },
  { to: "/audit", label: "Audit Logs", icon: History, roles: ["main_admin"] },
  { to: "/search", label: "Search", icon: Search },
];

export function AppSidebar({ onNav }: { onNav?: () => void }) {
  const { roles } = useAuth();
  const path = useRouterState({ select: (s) => s.location.pathname });

  const visible = NAV.filter((n) => !n.roles || n.roles.some((r) => roles.includes(r)));

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex items-center gap-3 border-b border-sidebar-border px-5 py-5">
        <img src={LOGO_URL} alt="South Group" className="h-10 w-10 rounded-full bg-white object-contain p-0.5" />
        <div className="min-w-0">
          <div className="truncate text-sm font-bold leading-tight text-sidebar-primary">South Group</div>
          <div className="truncate text-[11px] text-sidebar-foreground/70">Reporting Portal</div>
        </div>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {visible.map((item) => {
          const active = path === item.to || (item.to !== "/dashboard" && path.startsWith(item.to));
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={onNav}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                  : "text-sidebar-foreground/85 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-sidebar-border p-4 text-[11px] text-sidebar-foreground/60">
        © {COPYRIGHT_YEAR} Christ Embassy South Group
      </div>
    </aside>
  );
}
