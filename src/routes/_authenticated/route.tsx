import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { useAuth, AuthProvider } from "@/lib/auth";
import { AppSidebar } from "@/components/app-sidebar";
import { AppHeader } from "@/components/app-header";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  return (
    <AuthProvider>
      <Shell />
    </AuthProvider>
  );
}

function Shell() {
  const { loading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center">
        <div className="text-sm text-muted-foreground">Loading portal…</div>
      </div>
    );
  }
  return (
    <div className="flex min-h-screen w-full overflow-x-hidden">
      {sidebarOpen && (
        <div className="hidden md:block">
          <AppSidebar onClose={() => setSidebarOpen(false)} />
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col overflow-x-hidden">
        <AppHeader
          isSidebarOpen={sidebarOpen}
          onOpenSidebar={() => setSidebarOpen(true)}
        />
        <main className="w-full flex-1 overflow-x-hidden px-3 py-4 sm:px-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
