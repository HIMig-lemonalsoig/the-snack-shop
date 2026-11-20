import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Loader2, Trash2, Check, RotateCcw } from "lucide-react";
import { toast } from "sonner";
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

interface SnackRequest {
  id: string;
  item_name: string;
  requester_name: string | null;
  notes: string | null;
  status: string;
  created_at: string;
}

export const RequestsManager = () => {
  const [requests, setRequests] = useState<SnackRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data, error } = await supabase
      .from("snack_requests")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      toast.error("Couldn't load requests");
    } else {
      setRequests((data || []) as SnackRequest[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    const channel = supabase
      .channel("admin-requests")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "snack_requests" },
        () => load()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const setStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("snack_requests").update({ status }).eq("id", id);
    if (error) toast.error("Update failed");
    else toast.success(status === "done" ? "Marked as done" : "Reopened");
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("snack_requests").delete().eq("id", id);
    if (error) toast.error("Delete failed");
    else toast.success("Request deleted");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div className="rounded-3xl border-2 border-dashed border-border bg-card p-12 text-center">
        <div className="text-5xl">📭</div>
        <h2 className="mt-3 font-display text-xl">No requests yet</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Customer snack suggestions will show up here.
        </p>
      </div>
    );
  }

  const open = requests.filter((r) => r.status !== "done");
  const done = requests.filter((r) => r.status === "done");

  const renderCard = (r: SnackRequest) => (
    <Card key={r.id} className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold">{r.item_name}</h3>
            {r.status === "done" ? (
              <Badge variant="secondary">Done</Badge>
            ) : (
              <Badge>New</Badge>
            )}
          </div>
          {r.requester_name && (
            <p className="mt-1 text-xs text-muted-foreground">
              from <span className="font-medium">{r.requester_name}</span>
            </p>
          )}
          {r.notes && <p className="mt-2 whitespace-pre-wrap text-sm">{r.notes}</p>}
          <p className="mt-2 text-xs text-muted-foreground">
            {new Date(r.created_at).toLocaleString()}
          </p>
        </div>
        <div className="flex flex-col gap-2">
          {r.status === "done" ? (
            <Button size="sm" variant="outline" onClick={() => setStatus(r.id, "new")}>
              <RotateCcw className="h-4 w-4" />
            </Button>
          ) : (
            <Button size="sm" variant="outline" onClick={() => setStatus(r.id, "done")}>
              <Check className="h-4 w-4" />
            </Button>
          )}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="sm" variant="ghost" className="text-destructive">
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this request?</AlertDialogTitle>
                <AlertDialogDescription>This can't be undone.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => remove(r.id)}>Delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </Card>
  );

  return (
    <div className="space-y-6">
      <section>
        <h2 className="mb-3 font-display text-xl">Open ({open.length})</h2>
        {open.length === 0 ? (
          <p className="text-sm text-muted-foreground">All caught up! 🎉</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">{open.map(renderCard)}</div>
        )}
      </section>
      {done.length > 0 && (
        <section>
          <h2 className="mb-3 font-display text-xl text-muted-foreground">
            Done ({done.length})
          </h2>
          <div className="grid gap-3 md:grid-cols-2">{done.map(renderCard)}</div>
        </section>
      )}
    </div>
  );
};
