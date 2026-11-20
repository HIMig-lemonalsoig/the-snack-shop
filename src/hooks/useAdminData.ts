import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { SnackCategory } from "@/lib/categories";

export interface AdminSnack {
  id: string;
  name: string;
  price: number;
  quantity: number;
  emoji: string | null;
  category: SnackCategory;
}
export interface AdminSale {
  id: string;
  snack_id: string | null;
  snack_name: string;
  quantity_sold: number;
  unit_price: number;
  total_price: number;
  created_at: string;
}
export interface AdminRequest {
  id: string;
  item_name: string;
  requester_name: string | null;
  notes: string | null;
  status: string;
  created_at: string;
}

/** Days of sales history the overview needs (30-day period + the 30 days before it). */
const HISTORY_DAYS = 62;

/**
 * Loads everything the admin overview needs and keeps it live via realtime.
 * All three tables are protected by RLS: these queries only return rows when
 * the signed-in user has the admin role.
 */
export function useAdminData() {
  const [snacks, setSnacks] = useState<AdminSnack[]>([]);
  const [sales, setSales] = useState<AdminSale[]>([]);
  const [requests, setRequests] = useState<AdminRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<number>();

  const load = useCallback(async () => {
    const since = new Date(Date.now() - HISTORY_DAYS * 86_400_000).toISOString();
    const [s, sa, r] = await Promise.all([
      supabase.from("snacks").select("id,name,price,quantity,emoji,category").order("sort_order"),
      supabase.from("sales").select("id,snack_id,snack_name,quantity_sold,unit_price,total_price,created_at")
        .gte("created_at", since).order("created_at", { ascending: false }).limit(10_000),
      supabase.from("snack_requests").select("*").order("created_at", { ascending: false }).limit(500),
    ]);
    const firstError = s.error ?? sa.error ?? r.error;
    setError(firstError ? "Couldn't load dashboard data. Check your connection and try again." : null);
    if (s.data) setSnacks(s.data as AdminSnack[]);
    if (sa.data) setSales(sa.data.map((x) => ({ ...x, unit_price: Number(x.unit_price), total_price: Number(x.total_price) })) as AdminSale[]);
    if (r.data) setRequests(r.data as AdminRequest[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    // Debounce bursts of realtime events (e.g. a restock touching many rows).
    const schedule = () => {
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(load, 250);
    };
    const channel = supabase
      .channel("admin-overview")
      .on("postgres_changes", { event: "*", schema: "public", table: "snacks" }, schedule)
      .on("postgres_changes", { event: "*", schema: "public", table: "sales" }, schedule)
      .on("postgres_changes", { event: "*", schema: "public", table: "snack_requests" }, schedule)
      .subscribe();
    return () => {
      window.clearTimeout(timer.current);
      supabase.removeChannel(channel);
    };
  }, [load]);

  return { snacks, sales, requests, loading, error, reload: load };
}
