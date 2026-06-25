import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Bell, LogOut, Menu, User as UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { AppSidebar } from "./app-sidebar";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";

export function AppHeader({
  isSidebarOpen = true,
  onOpenSidebar,
}: {
  isSidebarOpen?: boolean;
  onOpenSidebar?: () => void;
}) {
  const { profile, roles, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const { count } = await supabase.from("notifications").select("id", { count: "exact", head: true }).eq("is_read", false);
      if (active) setUnread(count ?? 0);
    };
    load();
    const t = setInterval(load, 30000);
    return () => { active = false; clearInterval(t); };
  }, []);

  const roleLabel = roles.includes("main_admin") ? "Main Admin" : roles.includes("sub_admin") ? "Sub Admin" : "Submitter";

  return (
    <header className="sticky top-0 z-30 mx-3 mt-3 flex h-16 items-center justify-between gap-3 rounded-3xl border border-white/40 bg-card/70 px-4 shadow-[var(--shadow-card)] backdrop-blur-2xl dark:border-white/10 md:mx-6 md:px-6">
      <div className="flex min-w-0 items-center gap-3">
        {!isSidebarOpen && onOpenSidebar && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onOpenSidebar}
            aria-label="Open sidebar"
            className="hidden md:inline-flex"
          >
            <Menu className="h-5 w-5" />
          </Button>
        )}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 border-white/10 bg-transparent p-0 shadow-none">
            <AppSidebar onNav={() => setOpen(false)} />
          </SheetContent>
        </Sheet>
        <div className="min-w-0">
          <h1 className="truncate text-base font-semibold text-foreground md:text-lg">South Group Portal</h1>
          <p className="hidden text-xs text-muted-foreground md:block">Church Reporting & Analytics</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="icon" className="relative">
          <Link to="/notifications">
            <Bell className="h-5 w-5" />
            {unread > 0 && (
              <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </Link>
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="gap-2 px-2">
              <div className="grid h-8 w-8 place-items-center rounded-xl bg-primary/90 text-primary-foreground shadow-sm">
                <UserIcon className="h-4 w-4" />
              </div>
              <div className="hidden text-left md:block">
                <div className="text-xs font-semibold leading-tight">{profile?.full_name || profile?.email}</div>
                <div className="text-[10px] text-muted-foreground">{roleLabel}</div>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="text-sm font-medium">{profile?.full_name}</div>
              <div className="text-xs text-muted-foreground">{profile?.email}</div>
              <Badge variant="secondary" className="mt-1">{roleLabel}</Badge>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={signOut} className="text-destructive">
              <LogOut className="mr-2 h-4 w-4" /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
