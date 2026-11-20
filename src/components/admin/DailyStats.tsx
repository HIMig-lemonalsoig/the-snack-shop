import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatUSD, isToday } from "@/lib/format";
import { Loader2, TrendingUp, ShoppingBag, DollarSign } from "lucide-react";

interface Sale {
  id: string;
  snack_name: string;
  quantity_sold: number;
  total_price: number;
  created_at: string;
}

export const DailyStats = () => {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data } = await supabase
      .from("sales")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    setSales((data || []) as Sale[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const channel = supabase
      .channel("sales-stats")
      .on("postgres_changes", { event: "*", schema: "public", table: "sales" }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const todaySales = sales.filter((s) => isToday(s.created_at));
  const totalRevenue = todaySales.reduce((sum, s) => sum + Number(s.total_price), 0);
  const totalItems = todaySales.reduce((sum, s) => sum + s.quantity_sold, 0);

  // Per-item breakdown
  const breakdown = new Map<string, { qty: number; revenue: number }>();
  for (const s of todaySales) {
    const cur = breakdown.get(s.snack_name) || { qty: 0, revenue: 0 };
    cur.qty += s.quantity_sold;
    cur.revenue += Number(s.total_price);
    breakdown.set(s.snack_name, cur);
  }
  const sorted = Array.from(breakdown.entries()).sort((a, b) => b[1].qty - a[1].qty);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl">Today at a glance</h2>
        <p className="text-sm text-muted-foreground">
          {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard
          label="Money made"
          value={formatUSD(totalRevenue)}
          icon={<DollarSign className="h-5 w-5" />}
          gradient="bg-gradient-hero"
        />
        <StatCard
          label="Snacks sold"
          value={String(totalItems)}
          icon={<ShoppingBag className="h-5 w-5" />}
          gradient="bg-gradient-mint"
        />
        <StatCard
          label="Transactions"
          value={String(todaySales.length)}
          icon={<TrendingUp className="h-5 w-5" />}
          gradient="bg-accent"
        />
      </div>

      <div className="rounded-3xl border-2 border-border bg-card p-6 shadow-card">
        <h3 className="font-display text-xl">Top sellers today</h3>
        {sorted.length === 0 ? (
          <div className="py-10 text-center text-muted-foreground">
            <div className="text-4xl">🌅</div>
            <p className="mt-2">No sales yet today. Time to make some!</p>
          </div>
        ) : (
          <ul className="mt-4 space-y-2">
            {sorted.map(([name, info], i) => (
              <li key={name} className="flex items-center justify-between rounded-2xl bg-muted/50 px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                    {i + 1}
                  </span>
                  <span className="font-semibold">{name}</span>
                </div>
                <div className="text-right">
                  <div className="font-bold">{info.qty} sold</div>
                  <div className="text-xs text-muted-foreground">{formatUSD(info.revenue)}</div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

const StatCard = ({
  label, value, icon, gradient,
}: { label: string; value: string; icon: React.ReactNode; gradient: string }) => (
  <div className={`relative overflow-hidden rounded-3xl ${gradient} p-6 text-primary-foreground shadow-card`}>
    <div className="flex items-center justify-between">
      <span className="text-sm font-semibold opacity-90">{label}</span>
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/25">{icon}</div>
    </div>
    <div className="mt-3 font-display text-4xl font-bold">{value}</div>
  </div>
);
