import { useMemo, useState } from "react";
import {
  AlertTriangle, ArrowRight, Boxes, CircleDollarSign, Lightbulb, PackageX, Receipt, Search, ShoppingBag, TrendingDown,
} from "lucide-react";
import {
  DonutChart, GlassDialog, LineChart, Metric, Panel, StatusBadge, formatCount,
} from "@/components/ui/glassy-dashboard";
import { CATEGORIES, categoryLabel } from "@/lib/categories";
import type { AdminRequest, AdminSale, AdminSnack } from "@/hooks/useAdminData";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const PERIODS = ["Today", "7 days", "30 days"] as const;
export type Period = (typeof PERIODS)[number];

const LOW_STOCK = 3;
const usd = formatCount.usd;

type Bucket = { label: string; start: number; end: number };

/** Splits the current period (and the one before it) into chart buckets in local time. */
function buildBuckets(period: Period, now = new Date()) {
  const cur: Bucket[] = [];
  const prev: Bucket[] = [];
  if (period === "Today") {
    const midnight = new Date(now); midnight.setHours(0, 0, 0, 0);
    for (let h = 0; h < 24; h++) {
      const start = midnight.getTime() + h * 3_600_000;
      const label = new Date(start).toLocaleTimeString("en-US", { hour: "numeric" }).replace(" ", "").toLowerCase();
      cur.push({ label, start, end: start + 3_600_000 });
      prev.push({ label, start: start - 86_400_000, end: start - 86_400_000 + 3_600_000 });
    }
  } else {
    const days = period === "7 days" ? 7 : 30;
    const today = new Date(now); today.setHours(0, 0, 0, 0);
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today); d.setDate(d.getDate() - i);
      const e = new Date(d); e.setDate(e.getDate() + 1);
      const pd = new Date(d); pd.setDate(pd.getDate() - days);
      const pe = new Date(pd); pe.setDate(pe.getDate() + 1);
      const label = days === 7
        ? d.toLocaleDateString("en-US", { weekday: "short" })
        : d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      cur.push({ label, start: d.getTime(), end: e.getTime() });
      prev.push({ label, start: pd.getTime(), end: pe.getTime() });
    }
  }
  return { cur, prev };
}

function sumIn(sales: AdminSale[], start: number, end: number) {
  let revenue = 0, items = 0, orders = 0;
  for (const s of sales) {
    const t = new Date(s.created_at).getTime();
    if (t >= start && t < end) { revenue += s.total_price; items += s.quantity_sold; orders += 1; }
  }
  return { revenue, items, orders };
}

function pctChange(now: number, before: number): string | null {
  if (before === 0) return now > 0 ? "New" : null;
  const p = ((now - before) / before) * 100;
  return `${p >= 0 ? "+" : "−"}${Math.abs(p).toFixed(1)}%`;
}

type Inspect =
  | { kind: "request"; request: AdminRequest }
  | { kind: "stock"; snack: AdminSnack };

export function OverviewView({ period, snacks, sales, requests, goTo }: {
  period: Period; snacks: AdminSnack[]; sales: AdminSale[]; requests: AdminRequest[];
  goTo: (view: "inventory" | "sales" | "requests") => void;
}) {
  const [query, setQuery] = useState("");
  const [inspect, setInspect] = useState<Inspect | null>(null);
  const [busy, setBusy] = useState(false);

  const stats = useMemo(() => {
    const { cur, prev } = buildBuckets(period);
    const curRange = { start: cur[0].start, end: cur[cur.length - 1].end };
    const prevRange = { start: prev[0].start, end: prev[prev.length - 1].end };
    const now = sumIn(sales, curRange.start, curRange.end);
    const before = sumIn(sales, prevRange.start, prevRange.end);
    const line = cur.map((b) => sumIn(sales, b.start, b.end).revenue);
    const lineCmp = prev.map((b) => sumIn(sales, b.start, b.end).revenue);

    const inPeriod = sales.filter((s) => {
      const t = new Date(s.created_at).getTime();
      return t >= curRange.start && t < curRange.end;
    });

    const byId = new Map(snacks.map((s) => [s.id, s]));
    const catRevenue = new Map<string, number>();
    const top = new Map<string, { qty: number; revenue: number }>();
    for (const s of inPeriod) {
      const cat = (s.snack_id && byId.get(s.snack_id)?.category) || "other";
      catRevenue.set(cat, (catRevenue.get(cat) ?? 0) + s.total_price);
      const t = top.get(s.snack_name) ?? { qty: 0, revenue: 0 };
      t.qty += s.quantity_sold; t.revenue += s.total_price;
      top.set(s.snack_name, t);
    }
    const slices = CATEGORIES.map((c) => ({ label: c.label, value: catRevenue.get(c.value) ?? 0 })).filter((s) => s.value > 0);

    return {
      now, before, line, lineCmp, labels: cur.map((b) => b.label), inPeriod, slices,
      top: [...top.entries()].sort((a, b) => b[1].qty - a[1].qty).slice(0, 5),
    };
  }, [period, sales, snacks]);

  const lowStock = snacks.filter((s) => s.quantity > 0 && s.quantity <= LOW_STOCK);
  const soldOut = snacks.filter((s) => s.quantity === 0);
  const openRequests = requests.filter((r) => r.status !== "done");
  const avgSale = stats.now.orders ? stats.now.revenue / stats.now.orders : 0;
  const cmpLabel = period === "Today" ? "vs yesterday" : `vs previous ${period}`;

  const recent = stats.inPeriod
    .filter((s) => s.snack_name.toLowerCase().includes(query.trim().toLowerCase()))
    .slice(0, 8);

  const markDone = async (r: AdminRequest) => {
    setBusy(true);
    const { error } = await supabase.from("snack_requests").update({ status: "done" }).eq("id", r.id);
    setBusy(false);
    if (error) toast.error("Couldn't update that request.");
    else { toast.success("Request marked as done"); setInspect(null); }
  };

  return (
    <div className="gd-grid">
      <div className="gd-grid gd-grid-hero">
        <Panel title="Revenue" subtitle={period === "Today" ? new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }) : `Last ${period}`}
          action={<StatusBadge label="USD" />}>
          <div className="gd-big-number"><span className="gd-sr">{usd(stats.now.revenue)}</span><span aria-hidden="true" data-gd-count={stats.now.revenue} data-format="usd">{usd(stats.now.revenue)}</span></div>
          <div className="gd-metric-caption" style={{ marginTop: 8 }}>
            {pctChange(stats.now.revenue, stats.before.revenue) && (
              <span className="gd-delta" data-attention={stats.now.revenue < stats.before.revenue}>
                {pctChange(stats.now.revenue, stats.before.revenue)}
              </span>
            )}
            <span>{cmpLabel} ({usd(stats.before.revenue)})</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 16 }}>
            <button type="button" className="gd-primary" onClick={() => goTo("inventory")}>Manage menu <ArrowRight aria-hidden="true" /></button>
            <button type="button" className="gd-secondary" onClick={() => goTo("sales")}>Sales log <Receipt aria-hidden="true" /></button>
          </div>
        </Panel>
        <div className="gd-metric-grid">
          <Metric title="Snacks sold" icon={<ShoppingBag />} value={stats.now.items} tone="teal"
            change={pctChange(stats.now.items, stats.before.items)} detail={cmpLabel} />
          <Metric title="Sales" icon={<Receipt />} value={stats.now.orders}
            change={pctChange(stats.now.orders, stats.before.orders)} detail={cmpLabel} />
          <Metric title="Average sale" icon={<CircleDollarSign />} value={avgSale} format="usd" detail="per transaction" />
          <Metric title="Stock alerts" icon={<AlertTriangle />} value={lowStock.length + soldOut.length}
            tone={lowStock.length + soldOut.length > 0 ? "coral" : undefined}
            detail={`${soldOut.length} sold out · ${lowStock.length} low`} />
        </div>
      </div>

      <div className="gd-grid gd-grid-main">
        <Panel title="Revenue over time" subtitle={period === "Today" ? "By hour, compared with yesterday" : `By day, compared with the ${period} before`}
          action={<div className="gd-legend"><span><i data-tone="coral" aria-hidden="true" />This period</span><span><i data-tone="ink" data-dashed="true" aria-hidden="true" />Previous</span></div>}>
          {stats.now.revenue === 0 && stats.before.revenue === 0 ? (
            <p className="gd-empty">No sales in this period yet. Sales show up here automatically when you lower a snack's stock.</p>
          ) : (
            <LineChart title="Revenue over time" labels={stats.labels} primary={stats.line} comparison={stats.lineCmp}
              primaryLabel="This period" comparisonLabel="Previous" format={usd}
              axisFormat={(v) => (v >= 1000 ? `$${(v / 1000).toFixed(1)}k` : `$${Math.round(v)}`)} />
          )}
        </Panel>
        <Panel title="Revenue by category">
          {stats.slices.length === 0
            ? <p className="gd-empty">No category data yet.</p>
            : <DonutChart slices={stats.slices} total={stats.now.revenue} totalLabel="Total" format={usd} />}
        </Panel>
      </div>

      <Panel title="Needs attention" subtitle="Customer requests and stock that needs a restock">
        <div className="gd-lanes">
          <Lane title="New requests" tone="coral" icon={<Lightbulb />} count={openRequests.length}
            empty="No open requests." more={openRequests.length > 4 ? () => goTo("requests") : undefined}>
            {openRequests.slice(0, 4).map((r) => (
              <button key={r.id} type="button" className="gd-work-item" onClick={() => setInspect({ kind: "request", request: r })}>
                <strong>{r.item_name}</strong>
                <span>{r.requester_name ? `From ${r.requester_name}` : "Anonymous"} · {timeAgo(r.created_at)}</span>
              </button>
            ))}
          </Lane>
          <Lane title="Running low" tone="ochre" icon={<TrendingDown />} count={lowStock.length} empty="Everything is well stocked.">
            {lowStock.slice(0, 4).map((s) => (
              <button key={s.id} type="button" className="gd-work-item" onClick={() => setInspect({ kind: "stock", snack: s })}>
                <strong>{s.emoji} {s.name}</strong>
                <span>{s.quantity} left · {categoryLabel(s.category)}</span>
              </button>
            ))}
          </Lane>
          <Lane title="Sold out" tone="ink" icon={<PackageX />} count={soldOut.length} empty="Nothing is sold out.">
            {soldOut.slice(0, 4).map((s) => (
              <button key={s.id} type="button" className="gd-work-item" onClick={() => setInspect({ kind: "stock", snack: s })}>
                <strong>{s.emoji} {s.name}</strong>
                <span>Hidden under "Sold out" on the menu</span>
              </button>
            ))}
          </Lane>
        </div>
      </Panel>

      <div className="gd-grid gd-grid-main">
        <Panel title="Recent sales" action={
          <label className="gd-search"><Search aria-hidden="true" />
            <input type="search" placeholder="Filter by snack" aria-label="Filter recent sales by snack" value={query} onChange={(e) => setQuery(e.target.value)} />
          </label>
        }>
          <div className="gd-table-scroll">
            <table>
              <thead><tr><th scope="col">Snack</th><th scope="col" className="gd-num">Qty</th><th scope="col" className="gd-num">Total</th><th scope="col">When</th></tr></thead>
              <tbody>
                {recent.map((s) => (
                  <tr key={s.id}>
                    <td>{s.snack_name}</td>
                    <td className="gd-num">{s.quantity_sold}</td>
                    <td className="gd-num">{usd(s.total_price)}</td>
                    <td>{timeAgo(s.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {recent.length === 0 && <p className="gd-empty" role="status">No matching sales in this period.</p>}
        </Panel>
        <Panel title="Top sellers" subtitle={period === "Today" ? "Today" : `Last ${period}`}>
          {stats.top.length === 0 ? <p className="gd-empty">No sales yet.</p> : (
            <ol className="gd-rank">
              {stats.top.map(([name, t], i) => (
                <li key={name}>
                  <b>{i + 1}</b><span>{name}</span>
                  <div style={{ textAlign: "end" }}><strong>{t.qty} sold</strong><small>{usd(t.revenue)}</small></div>
                </li>
              ))}
            </ol>
          )}
        </Panel>
      </div>

      {inspect?.kind === "request" && (
        <GlassDialog title={inspect.request.item_name} close={() => setInspect(null)}>
          <StatusBadge label="New request" state="coral" />
          <div className="gd-dialog-body" style={{ marginTop: 12 }}>
            <p style={{ margin: 0 }}><strong>From:</strong> {inspect.request.requester_name || "Anonymous"}</p>
            <p style={{ margin: "4px 0 0" }}><strong>Sent:</strong> {new Date(inspect.request.created_at).toLocaleString()}</p>
            {/* Rendered as plain text by React, so public input can't inject HTML. */}
            {inspect.request.notes && <p style={{ margin: "10px 0 0", whiteSpace: "pre-wrap" }}>{inspect.request.notes}</p>}
          </div>
          <div className="gd-dialog-actions">
            <button type="button" className="gd-primary" disabled={busy} onClick={() => markDone(inspect.request)}>Mark done</button>
            <button type="button" className="gd-secondary" onClick={() => { setInspect(null); goTo("requests"); }}>All requests <ArrowRight aria-hidden="true" /></button>
          </div>
        </GlassDialog>
      )}
      {inspect?.kind === "stock" && (
        <GlassDialog title={`${inspect.snack.emoji ?? ""} ${inspect.snack.name}`} close={() => setInspect(null)}>
          <StatusBadge label={inspect.snack.quantity === 0 ? "Sold out" : `${inspect.snack.quantity} left`} state={inspect.snack.quantity === 0 ? "coral" : "ochre"} />
          <p className="gd-dialog-body" style={{ marginTop: 12 }}>
            {categoryLabel(inspect.snack.category)} · {usd(inspect.snack.price)} each. Restock it from the menu manager to put it back on sale.
          </p>
          <div className="gd-dialog-actions">
            <button type="button" className="gd-primary" onClick={() => { setInspect(null); goTo("inventory"); }}>
              <Boxes aria-hidden="true" /> Open menu manager
            </button>
          </div>
        </GlassDialog>
      )}
    </div>
  );
}

function Lane({ title, tone, icon, count, empty, more, children }: {
  title: string; tone: "coral" | "ochre" | "ink" | "teal"; icon: React.ReactNode; count: number;
  empty: string; more?: () => void; children: React.ReactNode;
}) {
  return (
    <section className="gd-lane" aria-label={title}>
      <header><i data-tone={tone} aria-hidden="true">{icon}</i><h3>{title}</h3><span>{count}</span></header>
      {count === 0 ? <p className="gd-empty">{empty}</p> : children}
      {more && <button type="button" className="gd-secondary" style={{ width: "100%", marginTop: 6 }} onClick={more}>See all {count}</button>}
    </section>
  );
}

function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function salesInPeriod(sales: AdminSale[], period: Period) {
  const { cur } = buildBuckets(period);
  const start = cur[0].start, end = cur[cur.length - 1].end;
  return sales.filter((s) => { const t = new Date(s.created_at).getTime(); return t >= start && t < end; });
}
