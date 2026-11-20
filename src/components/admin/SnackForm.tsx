import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DialogFooter } from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CATEGORIES, SnackCategory } from "@/lib/categories";

const EMOJIS = ["🍿", "🍪", "🍫", "🍬", "🍭", "🍩", "🧁", "🍰", "🍦", "🥨", "🍯", "🥜", "🍇", "🍎", "🥤", "🧃"];

export interface SnackFormState {
  name: string;
  description: string;
  price: string;
  quantity: string;
  emoji: string;
  category: SnackCategory;
}

export const emptySnackForm: SnackFormState = {
  name: "",
  description: "",
  price: "",
  quantity: "",
  emoji: "🍿",
  category: "other",
};

interface Props {
  form: SnackFormState;
  setForm: (f: SnackFormState) => void;
  onCancel: () => void;
  onSave: () => void;
  saving: boolean;
}

export const SnackForm = ({ form, setForm, onCancel, onSave, saving }: Props) => (
  <>
    <div className="space-y-4">
      <div>
        <Label>Emoji</Label>
        <div className="mt-1 flex flex-wrap gap-1">
          {EMOJIS.map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => setForm({ ...form, emoji: e })}
              className={`h-10 w-10 rounded-xl text-xl transition ${
                form.emoji === e ? "bg-primary/20 ring-2 ring-primary" : "hover:bg-muted"
              }`}
            >
              {e}
            </button>
          ))}
        </div>
      </div>
      <div>
        <Label htmlFor="name">Name</Label>
        <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      </div>
      <div>
        <Label htmlFor="category">Category</Label>
        <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v as SnackCategory })}>
          <SelectTrigger id="category">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map((c) => (
              <SelectItem key={c.value} value={c.value}>
                {c.emoji} {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="desc">Description (optional)</Label>
        <Textarea id="desc" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="price">Price (USD)</Label>
          <Input id="price" type="number" step="0.01" min="0" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
        </div>
        <div>
          <Label htmlFor="qty">Quantity</Label>
          <Input id="qty" type="number" min="0" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
        </div>
      </div>
    </div>
    <DialogFooter>
      <Button variant="outline" onClick={onCancel}>Cancel</Button>
      <Button onClick={onSave} disabled={saving}>
        {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Save
      </Button>
    </DialogFooter>
  </>
);
