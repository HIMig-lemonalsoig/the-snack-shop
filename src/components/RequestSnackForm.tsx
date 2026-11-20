import { useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Lightbulb, Loader2 } from "lucide-react";
import { z } from "zod";

// Strip control characters (except newlines in notes) before validating.
const clean = (s: string, keepNewlines = false) =>
  // eslint-disable-next-line no-control-regex
  s.replace(keepNewlines ? /[\u0000-\u0009\u000B-\u001F\u007F]/g : /[\u0000-\u001F\u007F]/g, "").trim();

const schema = z.object({
  item_name: z.string().min(1, "Tell us which snack you'd like").max(100, "Keep it under 100 characters"),
  requester_name: z.string().max(60, "Keep your name under 60 characters").optional(),
  notes: z.string().max(500, "Keep notes under 500 characters").optional(),
});

/** Client-side cooldown between requests. The database enforces its own limits too. */
const COOLDOWN_MS = 60_000;
const COOLDOWN_KEY = "snack-request-last";

const lastSent = () => {
  try { return Number(localStorage.getItem(COOLDOWN_KEY) || 0); } catch { return 0; }
};

export const RequestSnackForm = ({ trigger }: { trigger?: ReactNode }) => {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [itemName, setItemName] = useState("");
  const [requesterName, setRequesterName] = useState("");
  const [notes, setNotes] = useState("");
  const [website, setWebsite] = useState(""); // honeypot: real people never see or fill this
  const [error, setError] = useState<string | null>(null);

  const reset = () => { setItemName(""); setRequesterName(""); setNotes(""); setWebsite(""); setError(null); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (website) { // bot filled the hidden field: pretend success, send nothing
      toast.success("Thanks! Your request was sent.");
      reset(); setOpen(false);
      return;
    }
    const wait = COOLDOWN_MS - (Date.now() - lastSent());
    if (wait > 0) {
      setError(`You just sent one. Try again in ${Math.ceil(wait / 1000)} seconds.`);
      return;
    }

    const parsed = schema.safeParse({
      item_name: clean(itemName),
      requester_name: clean(requesterName) || undefined,
      notes: clean(notes, true) || undefined,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }

    setSubmitting(true);
    const { error: dbError } = await supabase.from("snack_requests").insert({
      item_name: parsed.data.item_name,
      requester_name: parsed.data.requester_name ?? null,
      notes: parsed.data.notes ?? null,
    });
    setSubmitting(false);

    if (dbError) {
      setError(dbError.message.includes("Too many")
        ? "Lots of requests right now. Please try again in a few minutes."
        : "Couldn't send your request. Check your connection and try again.");
      return;
    }
    try { localStorage.setItem(COOLDOWN_KEY, String(Date.now())); } catch { /* ignore */ }
    toast.success("Thanks! Your request was sent.");
    reset();
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setError(null); }}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="lg" className="rounded-full">
            <Lightbulb className="mr-2 h-5 w-5" aria-hidden /> Request a snack
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="rounded-3xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Suggest a snack</DialogTitle>
          <DialogDescription>Tell us what you'd love to see on the shelf. We read every request.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="item_name">Which snack? <span className="text-destructive" aria-hidden>*</span></Label>
            <Input id="item_name" value={itemName} onChange={(e) => setItemName(e.target.value)}
              placeholder="e.g. Sour Patch Kids" maxLength={100} required autoComplete="off"
              aria-invalid={!!error && !itemName.trim()} className="h-11" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="requester_name">Your first name <span className="font-normal text-muted-foreground">(optional)</span></Label>
            <Input id="requester_name" value={requesterName} onChange={(e) => setRequesterName(e.target.value)}
              placeholder="So we can thank you" maxLength={60} autoComplete="given-name" className="h-11" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes <span className="font-normal text-muted-foreground">(optional)</span></Label>
            <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)}
              placeholder="Brand, flavor, size…" maxLength={500} rows={3} />
            <p className="text-right text-xs text-muted-foreground">{notes.length}/500</p>
          </div>
          {/* Honeypot, hidden from people and screen readers */}
          <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
            <label htmlFor="website">Website</label>
            <input id="website" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
          </div>
          {error && <p role="alert" className="rounded-xl bg-destructive/10 px-3 py-2 text-sm font-semibold text-destructive">{error}</p>}
          <Button type="submit" className="h-11 w-full rounded-full" disabled={submitting}>
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />}
            {submitting ? "Sending…" : "Send request"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
