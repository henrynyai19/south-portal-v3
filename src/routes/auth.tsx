import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { LOGO_URL } from "@/lib/logo";
import { Loader2 } from "lucide-react";

const COPYRIGHT_YEAR = 2026;

export const Route = createFileRoute("/auth")({
  ssr: false,
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/dashboard" });
    });
  }, [navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Welcome back");
    navigate({ to: "/dashboard" });
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { full_name: fullName }, emailRedirectTo: window.location.origin },
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Account created. Signing you in…");
    navigate({ to: "/dashboard" });
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden flex-col justify-between p-12 text-white lg:flex" style={{ background: "linear-gradient(135deg, oklch(0.30 0.14 263), oklch(0.42 0.18 263))" }}>
        <div className="flex items-center gap-3">
          <img src={LOGO_URL} alt="Logo" className="h-12 w-12 rounded-full bg-white p-1" />
          <div>
            <div className="text-sm font-semibold text-gold">CHRIST EMBASSY</div>
            <div className="text-lg font-bold">South Group</div>
          </div>
        </div>
        <div className="space-y-4">
          <h2 className="text-4xl font-bold leading-tight">South Group Portal</h2>
          <p className="max-w-md text-white/80">
            A centralized reporting and analytics platform for churches, departments, and ministry units across the South Group region.
          </p>
          <div className="grid max-w-md grid-cols-2 gap-4 pt-4">
            {[
              ["Centralized", "reporting"],
              ["Real-time", "analytics"],
              ["Multi-level", "administration"],
              ["Compliance", "tracking"],
            ].map(([a, b]) => (
              <div key={a} className="rounded-lg border border-white/10 bg-white/5 p-4 backdrop-blur">
                <div className="text-sm font-bold text-gold">{a}</div>
                <div className="text-xs text-white/70">{b}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-1 text-xs text-white/60">
          <div>© {COPYRIGHT_YEAR} Christ Embassy South Group. All rights reserved.</div>
          <div>Built by OUVIA</div>
        </div>
      </div>

      <div className="flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-md space-y-4">
          <Card className="border-border/60 shadow-[var(--shadow-elegant)]">
            <CardHeader className="space-y-1 text-center">
              <div className="mx-auto mb-2 grid h-14 w-14 place-items-center rounded-full bg-secondary lg:hidden">
                <img src={LOGO_URL} alt="Logo" className="h-12 w-12 object-contain" />
              </div>
              <CardTitle className="text-2xl">Welcome</CardTitle>
              <CardDescription>Sign in to access the South Group Portal</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={tab} onValueChange={(v) => setTab(v as "signin" | "signup")}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="signin">Sign In</TabsTrigger>
                  <TabsTrigger value="signup">Sign Up</TabsTrigger>
                </TabsList>
                <TabsContent value="signin">
                  <form onSubmit={handleSignIn} className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label htmlFor="si-email">Email</Label>
                      <Input id="si-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@church.org" />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="si-pw">Password</Label>
                        <Link to="/auth/forgot-password" className="text-xs text-primary hover:underline">Forgot password?</Link>
                      </div>
                      <Input id="si-pw" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
                    </div>
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Sign In
                    </Button>
                  </form>
                </TabsContent>
                <TabsContent value="signup">
                  <form onSubmit={handleSignUp} className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label htmlFor="su-name">Full Name</Label>
                      <Input id="su-name" required value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Jane Doe" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="su-email">Email</Label>
                      <Input id="su-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="su-pw">Password</Label>
                      <Input id="su-pw" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
                    </div>
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Create Account
                    </Button>
                    <p className="text-center text-xs text-muted-foreground">
                      New accounts default to Submitter. Admins can change your role.
                    </p>
                  </form>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
          <div className="text-center text-xs text-muted-foreground lg:hidden">
            Built by OUVIA
          </div>
        </div>
      </div>
    </div>
  );
}
