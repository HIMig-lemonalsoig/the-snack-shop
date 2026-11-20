import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  ArrowDownToLine, Boxes, ChevronRight, LayoutDashboard, Lightbulb, Loader2, LogOut, Receipt, Store, Users,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useAdminData } from "@/hooks/useAdminData";
import { GlassDialog, GlassShell, saveCsv, type GlassView } from "@/components/ui/glassy-dashboard";
import { OverviewView, PERIODS, salesInPeriod, type Period } from "@/components/admin/OverviewView";
import { SnackManager } from "@/components/admin/SnackManager";
import { SalesLog } from "@/components/admin/SalesLog";
import { AdminManager } from "@/components/admin/AdminManager";
import { RequestsManager } from "@/components/admin/RequestsManager";
import { LOGO_URL } from "@/lib/assets";

type ViewId = "overview" | "inventory" | "sales" | "requests" | "team";
const VIEW_IDS: ViewId[] = ["overview", "inventory", "sales", "requests", "team"];

/** Sign staff out after this much inactivity (shared shop devices). */
const IDLE_LIMIT_MS = 30 * 60 * 1000;
const THEME_KEY = "snack-admin-theme";

const readTheme = (): "light" | "dark" => {
  try {
    const t = localStorage.getItem(THEME_KEY);
    if (t === "light" || t === "dark") return t;
  } catch { /* storage unavailable */ }
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
};

const SnackLogo = () => (
  <img src={LOGO_URL} alt="" width={38} height={38} style={{ width: 38, height: 38, borderRadius: "50%", objectFit: "cover" }} />
);

const Admin = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAdmin, loading, signOut } = useAuth();
  const authorized = !loading && !!user && isAdmin;

  useEffect(() => {
    if (loading) return;
    if (!user) navigate("/admin/login", { replace: true });
    else if (!isAdmin) {
      toast.error("This account doesn't have admin access.");
      signOut().finally(() => navigate("/", { replace: true }));
    }
  }, [user, isAdmin, loading, navigate, signOut]);

  if (!authorized) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background" role="status" aria-label="Checking access">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  return <AdminWorkspace email={user!.email ?? ""} hash={location.hash} onSignOut={async () => {
    await signOut();
    navigate("/admin/login", { replace: true });
  }} />;
};

function AdminWorkspace({ email, hash, onSignOut }: { email: string; hash: string; onSignOut: () => Promise<void> }) {
  const navigate = useNavigate();
  const fromHash = (h: string): ViewId => (VIEW_IDS.find((v) => v === h.slice(1)) ?? "overview");
  const [view, setView] = useState<ViewId>(() => fromHash(hash));
  const [period, setPeriod] = useState<Period>("Today");
  const [theme, setTheme] = useState<"light" | "dark">(readTheme);
  const [searchOpen, setSearchOpen] = useState(false);
  const { snacks, sales, requests, loading, error, reload } = useAdminData();

  useEffect(() => setView(fromHash(hash)), [hash]);

  // Keep shadcn dialogs/popovers (portaled to <body>) on the admin palette.
  useEffect(() => {
    document.body.classList.add("admin-theme");
    document.documentElement.classList.toggle("dark", theme === "dark");
    try { localStorage.setItem(THEME_KEY, theme); } catch { /* ignore */ }
    return () => {
      document.body.classList.remove("admin-theme");
      document.documentElement.classList.remove("dark");
    };
  }, [theme]);

  // Idle auto sign-out.
  useEffect(() => {
    let t = window.setTimeout(fire, IDLE_LIMIT_MS);
    function fire() {
      toast.info("Signed out after 30 minutes of inactivity.");
      onSignOut();
    }
    const bump = () => { window.clearTimeout(t); t = window.setTimeout(fire, IDLE_LIMIT_MS); };
    const events = ["pointerdown", "keydown", "scroll", "visibilitychange"] as const;
    events.forEach((e) => window.addEventListener(e, bump, { passive: true }));
    return () => { window.clearTimeout(t); events.forEach((e) => window.removeEventListener(e, bump)); };
  }, [onSignOut]);

  const select = useCallback((v: ViewId) => {
    navigate({ hash: v }, { replace: false });
    setView(v);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [navigate]);

  const openRequests = requests.filter((r) => r.status !== "done").length;
  const stockAlerts = snacks.filter((s) => s.quantity <= 3).length;

  const views: GlassView<ViewId>[] = useMemo(() => [
    { id: "overview", label: "Overview", short: "Home", icon: LayoutDashboard, description: "Revenue, best sellers, and what needs your attention." },
    { id: "inventory", label: "Menu & stock", short: "Menu", icon: Boxes, description: "Add snacks, update prices, restock, and drag to reorder the menu.", badge: stockAlerts },
    { id: "sales", label: "Sales log", short: "Sales", icon: Receipt, description: "Every sale, recorded automatically when stock goes down." },
    { id: "requests", label: "Requests", short: "Requests", icon: Lightbulb, description: "Snacks customers asked you to carry.", badge: openRequests },
    { id: "team", label: "Team", short: "Team", icon: Users, description: "Staff accounts and who has admin access." },
  ], [openRequests, stockAlerts]);

  const exportSales = () => {
    const rows = salesInPeriod(sales, period);
    if (rows.length === 0) { toast.info("No sales to export for this period."); return; }
    saveCsv(`snack-sales-${period.replace(" ", "-").toLowerCase()}-${new Date().toISOString().slice(0, 10)}.csv`, [
      ["Date", "Snack", "Quantity", "Unit price (USD)", "Total (USD)"],
      ...rows.map((s) => [new Date(s.created_at).toLocaleString(), s.snack_name, s.quantity_sold, s.unit_price.toFixed(2), s.total_price.toFixed(2)]),
    ]);
  };

  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-white focus:px-4 focus:py-2">Skip to content</a>
      <GlassShell
        workspaceName="Snack Shop HQ"
        workspaceSubtitle={email}
        logo={<SnackLogo />}
        views={views}
        active={view}
        onSelect={select}
        theme={theme}
        onToggleTheme={() => setTheme((t) => (t === "light" ? "dark" : "light"))}
        onOpenSearch={() => setSearchOpen(true)}
        animationKey={`${view}-${view === "overview" ? period : ""}-${loading}`}
        headerActions={<>
          <button type="button" className="gd-icon-button" aria-label="View the customer menu" title="View shop" onClick={() => navigate("/")}>
            <Store aria-hidden="true" />
          </button>
          <button type="button" className="gd-icon-button" aria-label="Sign out" title="Sign out" onClick={onSignOut}>
            <LogOut aria-hidden="true" />
          </button>
        </>}
        viewActions={view === "overview" ? <>
          <div className="gd-period" role="group" aria-label="Reporting period">
            {PERIODS.map((p) => <button type="button" key={p} aria-pressed={p === period} onClick={() => setPeriod(p)}>{p}</button>)}
          </div>
          <button type="button" className="gd-primary" onClick={exportSales}><ArrowDownToLine aria-hidden="true" /> Export CSV</button>
        </> : undefined}
        footerLeft={<span>Live · updates automatically</span>}
        footerRight={<span>Signed in as admin</span>}
      >
        {error && (
          <div className="gd-panel" role="alert" style={{ marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
            <span>{error}</span>
            <button type="button" className="gd-secondary" onClick={reload}>Retry</button>
          </div>
        )}
        {view === "overview" && (loading
          ? <div className="gd-panel" role="status" style={{ display: "grid", placeItems: "center", minHeight: 300 }}><Loader2 className="h-6 w-6 animate-spin" aria-label="Loading" /></div>
          : <OverviewView period={period} snacks={snacks} sales={sales} requests={requests} goTo={select} />)}
        {view !== "overview" && (
          <section className="gd-panel gd-embed" data-gd-enter>
            {view === "inventory" && <SnackManager />}
            {view === "sales" && <SalesLog />}
            {view === "requests" && <RequestsManager />}
            {view === "team" && <AdminManager />}
          </section>
        )}
      </GlassShell>

      {searchOpen && (
        <QuickSearch theme={theme} views={views} snacks={snacks} close={() => setSearchOpen(false)}
          go={(v) => { setSearchOpen(false); select(v); }} />
      )}
    </>
  );
}

function QuickSearch({ views, snacks, close, go, theme }: {
  theme: "light" | "dark"; views: GlassView<ViewId>[]; snacks: { id: string; name: string; emoji: string | null; quantity: number }[];
  close: () => void; go: (v: ViewId) => void;
}) {
  const [q, setQ] = useState("");
  const terms = q.toLowerCase().trim().split(/\s+/).filter(Boolean);
  const match = (text: string) => terms.every((t) => text.toLowerCase().includes(t));
  const viewHits = views.filter((v) => match(`${v.label} ${v.description}`));
  const snackHits = terms.length ? snacks.filter((s) => match(s.name)).slice(0, 6) : [];
  return (
    <div className="gd-app gd-portal" data-theme={theme}>
      <GlassDialog title="Jump to…" close={close}>
        <label className="gd-search gd-command-input">
          <input type="search" aria-label="Search sections and snacks" placeholder="Search sections or snacks" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
        <div className="gd-quick-list">
          {viewHits.map(({ id, label, description, icon: Icon }) => (
            <button key={id} type="button" onClick={() => go(id)}>
              <Icon aria-hidden="true" /><div><strong>{label}</strong><small>{description}</small></div><ChevronRight aria-hidden="true" />
            </button>
          ))}
          {snackHits.map((s) => (
            <button key={s.id} type="button" onClick={() => go("inventory")}>
              <Boxes aria-hidden="true" /><div><strong>{s.emoji} {s.name}</strong><small>{s.quantity === 0 ? "Sold out" : `${s.quantity} in stock`} · open in Menu & stock</small></div><ChevronRight aria-hidden="true" />
            </button>
          ))}
          {viewHits.length === 0 && snackHits.length === 0 && <p className="gd-empty" role="status">No matches.</p>}
        </div>
      </GlassDialog>
    </div>
  );
}

export default Admin;
