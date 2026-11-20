import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, LayoutGrid, Lightbulb, Radio, Search, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PublicSnackCard, type PublicSnack } from "@/components/PublicSnackCard";
import { RequestSnackForm } from "@/components/RequestSnackForm";
import { Button } from "@/components/ui/button";
import { CATEGORIES, type SnackCategory } from "@/lib/categories";
import { formatUSD } from "@/lib/format";
import { cn } from "@/lib/utils";
import { LOGO_URL } from "@/lib/assets";

type FilterValue = "all" | SnackCategory;

const GRID = "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";

const Index = () => {
  const [snacks, setSnacks] = useState<PublicSnack[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [filter, setFilter] = useState<FilterValue>("all");
  const [query, setQuery] = useState("");
  const [showSoldOut, setShowSoldOut] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      // Only the columns the menu needs.
      const { data, error } = await supabase
        .from("snacks")
        .select("id,name,description,price,quantity,emoji,category")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });
      if (!alive) return;
      setFailed(!!error);
      if (data) setSnacks(data.map((s) => ({ ...s, price: Number(s.price) })) as PublicSnack[]);
      setLoading(false);
    };
    load();
    const channel = supabase
      .channel("public-snacks")
      .on("postgres_changes", { event: "*", schema: "public", table: "snacks" }, load)
      .subscribe();
    return () => { alive = false; supabase.removeChannel(channel); };
  }, []);

  const q = query.trim().toLowerCase();
  const matches = (s: PublicSnack) =>
    (filter === "all" || s.category === filter) &&
    (!q || s.name.toLowerCase().includes(q) || (s.description ?? "").toLowerCase().includes(q));

  const inStock = snacks.filter((s) => s.quantity > 0);
  const visible = inStock.filter(matches);
  const soldOut = snacks.filter((s) => s.quantity === 0 && matches(s));
  const counts = useMemo(() => {
    const m = new Map<SnackCategory, number>();
    inStock.forEach((s) => m.set(s.category, (m.get(s.category) ?? 0) + 1));
    return m;
  }, [inStock]);
  const cheapest = inStock.length ? Math.min(...inStock.map((s) => s.price)) : null;
  const filtering = filter !== "all" || !!q;

  const clearFilters = () => { setFilter("all"); setQuery(""); searchRef.current?.focus(); };

  return (
    <div className="min-h-dvh bg-background">
      <a href="#menu" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-card focus:px-4 focus:py-2 focus:shadow-card">
        Skip to menu
      </a>

      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b border-border/70 bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4">
          <Link to="/" className="flex items-center gap-2.5 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <img src={LOGO_URL} alt="" width={40} height={40} className="h-10 w-10 rounded-full object-cover shadow-pop ring-2 ring-white" />
            <span className="font-display text-xl font-bold tracking-tight">The Snack Shop</span>
          </Link>
          <RequestSnackForm trigger={
            <Button size="sm" variant="outline" className="h-10 rounded-full border-2 font-bold">
              <Lightbulb className="mr-1.5 h-4 w-4" aria-hidden /> <span className="hidden sm:inline">Request a snack</span><span className="sm:hidden">Request</span>
            </Button>
          } />
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-4 pt-6 md:pt-10">
        <div className="relative overflow-hidden rounded-[2rem] bg-gradient-hero px-6 py-10 text-white shadow-soft md:px-12 md:py-14">
          <img src={LOGO_URL} alt="" aria-hidden className="pointer-events-none absolute -right-12 -top-12 h-52 w-52 select-none rounded-full opacity-25 md:-right-8 md:h-72 md:w-72" />
          <p className="inline-flex items-center gap-2 rounded-full bg-black/15 px-3 py-1 text-sm font-bold backdrop-blur-sm">
            <Radio className="h-4 w-4" aria-hidden /> Live menu · updates as we sell
          </p>
          <h1 className="mt-4 max-w-xl font-display text-4xl font-bold leading-[1.05] md:text-6xl">
            Grab something good.
          </h1>
          <p className="mt-3 max-w-md text-lg font-semibold text-white/90">
            Fresh snacks, fair prices, and you can see exactly what's left before you walk over.
          </p>
          <dl className="mt-7 grid max-w-md grid-cols-3 gap-2 sm:gap-3">
            <Stat label="In stock now" value={loading ? "…" : String(inStock.length)} />
            <Stat label="Prices from" value={loading ? "…" : cheapest !== null ? formatUSD(cheapest) : "–"} />
            <Stat label="Categories" value={loading ? "…" : String(counts.size)} />
          </dl>
        </div>
      </section>

      {/* Search + filters */}
      <div className="sticky top-16 z-20 mt-6 border-b border-border/60 bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 md:flex-row md:items-center">
          <label className="relative flex h-11 w-full items-center md:w-72">
            <span className="sr-only">Search snacks</span>
            <Search className="pointer-events-none absolute left-3.5 h-4 w-4 text-muted-foreground" aria-hidden />
            <input
              ref={searchRef}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search snacks"
              maxLength={60}
              className="h-full w-full rounded-full border-2 border-border bg-card pl-10 pr-10 text-base font-semibold placeholder:text-muted-foreground focus-visible:border-primary focus-visible:outline-none"
            />
            {query && (
              <button type="button" onClick={() => setQuery("")} aria-label="Clear search"
                className="absolute right-1.5 flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted">
                <X className="h-4 w-4" />
              </button>
            )}
          </label>
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] md:mx-0 md:flex-wrap md:overflow-visible md:px-0 md:pb-0" role="group" aria-label="Filter by category">
            <Chip active={filter === "all"} onClick={() => setFilter("all")} icon={<LayoutGrid className="h-4 w-4" aria-hidden />} label="All" count={inStock.length} />
            {CATEGORIES.filter((c) => counts.has(c.value)).map((c) => (
              <Chip key={c.value} active={filter === c.value} onClick={() => setFilter(c.value)}
                icon={<c.icon className="h-4 w-4" aria-hidden />} label={c.label} count={counts.get(c.value) ?? 0} />
            ))}
          </div>
        </div>
      </div>

      {/* Menu */}
      <main id="menu" className="mx-auto max-w-6xl px-4 py-8 md:py-10">
        <p className="sr-only" aria-live="polite">
          {loading ? "Loading menu" : `${visible.length} snacks shown`}
        </p>

        {loading ? (
          <div className={GRID} aria-hidden>
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-32 animate-pulse rounded-3xl bg-muted sm:h-72" />
            ))}
          </div>
        ) : failed && snacks.length === 0 ? (
          <EmptyState emoji="📡" title="Couldn't load the menu" body="Check your connection and try again.">
            <Button className="rounded-full" onClick={() => window.location.reload()}>Try again</Button>
          </EmptyState>
        ) : snacks.length === 0 ? (
          <EmptyState emoji="🍪" title="Menu coming soon" body="We're restocking the shelves. Check back in a bit!" />
        ) : visible.length === 0 && soldOut.length === 0 ? (
          <EmptyState emoji="🔍" title="No snacks match" body={q ? `Nothing found for “${query.trim()}”.` : "Nothing in this category right now."}>
            <Button variant="outline" className="rounded-full border-2" onClick={clearFilters}>Show all snacks</Button>
          </EmptyState>
        ) : filtering ? (
          <div className={GRID}>{visible.map((s) => <PublicSnackCard key={s.id} snack={s} />)}</div>
        ) : (
          <div className="space-y-12">
            {CATEGORIES.map((cat) => {
              const items = visible.filter((s) => s.category === cat.value);
              if (!items.length) return null;
              return (
                <section key={cat.value} aria-labelledby={`cat-${cat.value}`}>
                  <h2 id={`cat-${cat.value}`} className="mb-4 flex items-center gap-2.5 font-display text-2xl md:text-3xl">
                    <span className={cn("flex h-9 w-9 items-center justify-center rounded-xl", cat.tile)}>
                      <cat.icon className="h-5 w-5" aria-hidden />
                    </span>
                    {cat.label}
                    <span className="text-base font-semibold text-muted-foreground">({items.length})</span>
                  </h2>
                  <div className={GRID}>{items.map((s) => <PublicSnackCard key={s.id} snack={s} />)}</div>
                </section>
              );
            })}
          </div>
        )}

        {!loading && soldOut.length > 0 && (
          <section className="mt-12">
            <button type="button" onClick={() => setShowSoldOut((v) => !v)} aria-expanded={showSoldOut} aria-controls="sold-out"
              className="flex min-h-11 items-center gap-2 rounded-full px-1 font-display text-xl text-muted-foreground hover:text-foreground">
              <ChevronDown className={cn("h-5 w-5 transition-transform", showSoldOut && "rotate-180")} aria-hidden />
              Sold out right now ({soldOut.length})
            </button>
            {showSoldOut && (
              <div id="sold-out" className={cn(GRID, "mt-4")}>
                {soldOut.map((s) => <PublicSnackCard key={s.id} snack={s} />)}
              </div>
            )}
          </section>
        )}

        {/* Request CTA */}
        {!loading && (
          <section className="mt-14 flex flex-col items-start justify-between gap-4 rounded-[2rem] border-2 border-dashed border-border bg-card p-6 md:flex-row md:items-center md:p-8">
            <div>
              <h2 className="font-display text-2xl">Don't see your favorite?</h2>
              <p className="mt-1 text-muted-foreground">Tell us what to stock next. Popular requests go on the shelf.</p>
            </div>
            <RequestSnackForm />
          </section>
        )}
      </main>

      <footer className="border-t border-border py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 text-sm text-muted-foreground sm:flex-row">
          <p>© {new Date().getFullYear()} The Snack Shop</p>
          <Link to="/admin/login" className="rounded-full px-3 py-2 font-semibold hover:text-foreground">Staff sign in</Link>
        </div>
      </footer>
    </div>
  );
};

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-black/15 px-3 py-3 backdrop-blur-sm sm:px-4">
      <dt className="text-[11px] font-bold uppercase leading-tight tracking-wider text-white/90">{label}</dt>
      <dd className="mt-1 font-display text-xl font-bold tabular-nums sm:text-2xl">{value}</dd>
    </div>
  );
}

function Chip({ active, onClick, icon, label, count }: {
  active: boolean; onClick: () => void; icon: React.ReactNode; label: string; count: number;
}) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active}
      className={cn(
        "inline-flex h-11 shrink-0 items-center gap-2 rounded-full border-2 px-4 text-sm font-bold transition-colors duration-150",
        active ? "border-foreground bg-foreground text-background" : "border-border bg-card text-foreground hover:border-foreground/40",
      )}>
      {icon}{label}
      <span className={cn("rounded-full px-1.5 text-xs tabular-nums", active ? "bg-background/20" : "bg-muted")}>{count}</span>
    </button>
  );
}

function EmptyState({ emoji, title, body, children }: { emoji: string; title: string; body: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-[2rem] border-2 border-dashed border-border bg-card px-6 py-14 text-center">
      <div className="text-6xl" aria-hidden>{emoji}</div>
      <h2 className="mt-4 font-display text-2xl">{title}</h2>
      <p className="mt-2 max-w-sm text-muted-foreground">{body}</p>
      {children && <div className="mt-5">{children}</div>}
    </div>
  );
}

export default Index;
