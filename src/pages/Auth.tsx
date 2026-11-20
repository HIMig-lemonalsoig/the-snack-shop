import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, ArrowLeft, Eye, EyeOff } from "lucide-react";
import { LOGO_URL } from "@/lib/assets";

const Auth = () => {
  const navigate = useNavigate();
  const { user, isAdmin, loading: authLoading, signOut } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading || !user) return;
    if (isAdmin) {
      navigate("/admin", { replace: true });
    } else {
      // Signed in but not staff: don't leave a dangling session around.
      setError("This account doesn't have staff access.");
      signOut();
    }
  }, [user, isAdmin, authLoading, navigate, signOut]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const { error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setSubmitting(false);
    if (authError) {
      // One generic message: never reveal whether the email exists.
      setError(authError.status === 429
        ? "Too many attempts. Wait a minute and try again."
        : "Email or password is incorrect.");
      setPassword("");
      return;
    }
    toast.success("Welcome back!");
  };

  return (
    <div className="min-h-dvh bg-background bg-confetti">
      <div className="container mx-auto px-4 py-6">
        <Link to="/" className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to menu
        </Link>
      </div>

      <div className="container mx-auto flex min-h-[80vh] items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="rounded-3xl border-2 border-border bg-card p-8 shadow-card">
            <div className="mb-6 text-center">
              <img src={LOGO_URL} alt="" width={64} height={64} className="mx-auto h-16 w-16 rounded-full object-cover shadow-card ring-4 ring-white" />
              <h1 className="mt-3 font-display text-3xl">Staff Sign In</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Authorized staff only
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 h-11"
                />
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <div className="relative mt-1">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-11 pr-11"
                  />
                  <button type="button" onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground hover:bg-muted">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              {error && <p role="alert" className="rounded-xl bg-destructive/10 px-3 py-2 text-sm font-semibold text-destructive">{error}</p>}
              <Button type="submit" disabled={submitting} className="w-full" size="lg">
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Sign In
              </Button>
            </form>

            <p className="mt-6 rounded-2xl bg-muted p-3 text-xs text-muted-foreground">
              Public sign-ups are disabled. To add a new staff member, an existing admin must invite them from the dashboard.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
