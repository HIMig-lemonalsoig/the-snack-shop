import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatUSD, isToday, isThisWeek } from "@/lib/format";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Sale {
  id: string;
  snack_name: string;
  quantity_sold: number;
  unit_price: number;
  total_price: number;
  created_at: string;
}

type Filter = "today" | "week" | "all";

export const SalesLog = () => {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("today");

  const load = async () => {
    const { data } = await supabase
      .from("sales")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1000);
    setSales((data || []) as Sale[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const channel = supabase
      .channel("sales-log")
      .on("postgres_changes", { event: "*", schema: "public", table: "sales" }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const filtered = sales.filter((s) => {
    if (filter === "today") return isToday(s.created_at);
    if (filter === "week") return isThisWeek(s.created_at);
    return true;
  });

  const totalRevenue = filtered.reduce((sum, s) => sum + Number(s.total_price), 0);

  const deleteSale = async (id: string) => {
    const { error } = await supabase.from("sales").delete().eq("id", id);
    if (error) {
      toast.error("Couldn't delete sale: " + error.message);
      return;
    }
    setSales((prev) => prev.filter((s) => s.id !== id));
    toast.success("Sale removed");
  };

  const clearVisible = async () => {
    if (filtered.length === 0) return;
    const ids = filtered.map((s) => s.id);
    const { error } = await supabase.from("sales").delete().in("id", ids);
    if (error) {
      toast.error("Couldn't clear sales: " + error.message);
      return;
    }
    setSales((prev) => prev.filter((s) => !ids.includes(s.id)));
    toast.success(`Cleared ${ids.length} sale${ids.length === 1 ? "" : "s"}`);
  };

  const clearLabel =
    filter === "today" ? "today's" : filter === "week" ? "this week's" : "all";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-2xl">Sales history</h2>
        <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
          <TabsList>
            <TabsTrigger value="today">Today</TabsTrigger>
            <TabsTrigger value="week">This week</TabsTrigger>
            <TabsTrigger value="all">All time</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="rounded-2xl bg-gradient-mint p-4 text-secondary-foreground">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-semibold opacity-80">
              {filter === "today" ? "Today's" : filter === "week" ? "This week's" : "All-time"} revenue
            </div>
            <div className="font-display text-3xl font-bold">{formatUSD(totalRevenue)}</div>
            <div className="text-xs opacity-80">{filtered.length} transactions</div>
          </div>
          {filtered.length > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  <Trash2 className="mr-2 h-4 w-4" /> Clear
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Clear {clearLabel} sales?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete {filtered.length} sale
                    {filtered.length === 1 ? "" : "s"} from the log. Stock quantities
                    won't be affected. This can't be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={clearVisible}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Yes, clear them
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl border-2 border-dashed border-border bg-card p-10 text-center">
          <div className="text-5xl">📭</div>
          <p className="mt-3 text-muted-foreground">No sales in this period yet.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-3xl border-2 border-border bg-card shadow-card">
          <ul className="divide-y divide-border">
            {filtered.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-3 px-5 py-3">
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold">{s.snack_name}</div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(s.created_at).toLocaleString("en-US", {
                      month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
                    })}
                    {" · "}
                    {s.quantity_sold} × {formatUSD(s.unit_price)}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="font-display text-lg font-bold text-primary">
                    {formatUSD(s.total_price)}
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        aria-label="Delete sale"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete this sale?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Removes {s.quantity_sold} × {s.snack_name} ({formatUSD(s.total_price)})
                          from the log. Stock won't be changed.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => deleteSale(s.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
