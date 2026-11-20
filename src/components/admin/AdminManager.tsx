import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Loader2, ShieldCheck, Shield, RefreshCw, UserPlus, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

interface UserRow {
  id: string;
  email: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  is_admin: boolean;
}

export const AdminManager = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [actingOn, setActingOn] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [newAsAdmin, setNewAsAdmin] = useState(true);
  const [creating, setCreating] = useState(false);

  const generatePassword = () => {
    const chars = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    // Cryptographically secure (Math.random is predictable). Rejection sampling avoids modulo bias.
    let pw = "";
    const buf = new Uint8Array(1);
    while (pw.length < 16) {
      crypto.getRandomValues(buf);
      if (buf[0] < 256 - (256 % chars.length)) pw += chars[buf[0] % chars.length];
    }
    setNewPassword(pw);
    setShowPassword(true);
  };

  const createAccount = async () => {
    const email = newEmail.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return toast.error("Please enter a valid email address.");
    }
    if (newPassword.length < 10) {
      return toast.error("Password must be at least 10 characters.");
    }
    setCreating(true);
    const { data, error } = await supabase.functions.invoke("create-user", {
      body: { email, password: newPassword, make_admin: newAsAdmin },
    });
    setCreating(false);

    // Extract error message from FunctionsHttpError (non-2xx) or data payload
    let errMsg = (data as { error?: string })?.error;
    if (!errMsg && error) {
      try {
        const ctx = (error as { context?: Response }).context;
        if (ctx && typeof ctx.json === "function") {
          const body = await ctx.json();
          errMsg = body?.error;
        }
      } catch { /* ignore */ }
      errMsg = errMsg || error.message;
    }
    if (errMsg) {
      if (/already been registered|already exists/i.test(errMsg)) {
        return toast.error("That email already has an account.", {
          description: "Find them in the user list below and click 'Promote to admin' instead.",
        });
      }
      return toast.error(errMsg);
    }
    toast.success(`Account created for ${email}`, {
      description: "Share their email + password so they can sign in.",
    });
    setNewEmail("");
    setNewPassword("");
    setShowPassword(false);
    setCreateOpen(false);
    load();
  };

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("list-users");
    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }
    setUsers(((data as { users: UserRow[] })?.users) || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const setRole = async (target: UserRow, action: "promote" | "demote") => {
    if (action === "demote" && target.id === user?.id) {
      return toast.error("You can't demote yourself.");
    }
    if (!confirm(action === "promote" ? `Promote ${target.email} to admin?` : `Remove admin role from ${target.email}?`)) return;
    setActingOn(target.id);
    const { data, error } = await supabase.functions.invoke("set-admin-role", {
      body: { user_id: target.id, action },
    });
    setActingOn(null);
    const errMsg = (data as { error?: string })?.error || error?.message;
    if (errMsg) return toast.error(errMsg);
    toast.success(action === "promote" ? "Promoted to admin" : "Admin removed");
    load();
  };

  const admins = users.filter((u) => u.is_admin);
  const others = users.filter((u) => !u.is_admin);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl">Admins & users</h2>
          <p className="text-sm text-muted-foreground">
            Promote any signed-up user to admin with one click.
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <UserPlus className="mr-2 h-4 w-4" /> Create account
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="font-display text-xl flex items-center gap-2">
                  <UserPlus className="h-5 w-5" /> Create a new account
                </DialogTitle>
                <DialogDescription>
                  Set their email and password — they can sign in right away. Share the credentials with them.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label htmlFor="new-email">Email</Label>
                  <Input
                    id="new-email"
                    type="email"
                    placeholder="friend@example.com"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    autoFocus
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="new-password">Password</Label>
                    <button
                      type="button"
                      className="text-xs font-semibold text-primary hover:underline"
                      onClick={generatePassword}
                    >
                      Generate
                    </button>
                  </div>
                  <div className="relative">
                    <Input
                      id="new-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="At least 10 characters"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && !creating && createAccount()}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((s) => !s)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox
                    checked={newAsAdmin}
                    onCheckedChange={(c) => setNewAsAdmin(!!c)}
                  />
                  Make this user an admin
                </label>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={creating}>
                  Cancel
                </Button>
                <Button onClick={createAccount} disabled={creating || !newEmail.trim() || !newPassword}>
                  {creating ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating…</>
                  ) : (
                    <><UserPlus className="mr-2 h-4 w-4" /> Create account</>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (
        <>
          <section className="rounded-3xl border-2 border-border bg-card p-6 shadow-card">
            <h3 className="mb-3 font-display text-lg flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-success" /> Admins ({admins.length})
            </h3>
            <ul className="space-y-2">
              {admins.map((u) => (
                <li key={u.id} className="flex items-center justify-between gap-3 rounded-2xl bg-muted/50 px-4 py-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-semibold">{u.email || "—"}</span>
                      {u.id === user?.id && <Badge variant="secondary">You</Badge>}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Joined {new Date(u.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setRole(u, "demote")}
                    disabled={u.id === user?.id || actingOn === u.id}
                  >
                    {actingOn === u.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Remove admin"}
                  </Button>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-3xl border-2 border-border bg-card p-6 shadow-card">
            <h3 className="mb-3 font-display text-lg flex items-center gap-2">
              <Shield className="h-5 w-5 text-muted-foreground" /> Other users ({others.length})
            </h3>
            {others.length === 0 ? (
              <p className="text-sm text-muted-foreground">No other users yet.</p>
            ) : (
              <ul className="space-y-2">
                {others.map((u) => (
                  <li key={u.id} className="flex items-center justify-between gap-3 rounded-2xl bg-muted/50 px-4 py-3">
                    <div className="min-w-0">
                      <div className="truncate font-semibold">{u.email || "—"}</div>
                      <div className="text-xs text-muted-foreground">
                        Joined {new Date(u.created_at).toLocaleDateString()}
                        {u.last_sign_in_at && ` · Last active ${new Date(u.last_sign_in_at).toLocaleDateString()}`}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => setRole(u, "promote")}
                      disabled={actingOn === u.id}
                    >
                      {actingOn === u.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Promote to admin"}
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}

      <div className="rounded-2xl bg-accent/30 p-4 text-sm">
        <strong>Add a new admin in seconds:</strong>
        <ol className="mt-2 list-decimal space-y-1 pl-5">
          <li>Click <strong>Create account</strong> at the top.</li>
          <li>Type their email, hit <em>Generate</em> for a password (or set your own).</li>
          <li>Tick "Make this user an admin", then send them the email + password — they can sign in immediately.</li>
        </ol>
      </div>
    </div>
  );
};
