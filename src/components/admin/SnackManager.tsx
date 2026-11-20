import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { SnackForm, SnackFormState, emptySnackForm } from "./SnackForm";
import { SortableSnackCard, AdminSnack } from "./SortableSnackCard";
import { CATEGORIES, SnackCategory, categoryEmoji, categoryLabel } from "@/lib/categories";

export const SnackManager = () => {
  const [snacks, setSnacks] = useState<AdminSnack[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AdminSnack | null>(null);
  const [form, setForm] = useState<SnackFormState>(emptySnackForm);
  const [saving, setSaving] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const load = async () => {
    const { data, error } = await supabase
      .from("snacks")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) toast.error(error.message);
    setSnacks((data || []) as AdminSnack[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const openNew = () => {
    setEditing(null);
    setForm(emptySnackForm);
    setDialogOpen(true);
  };

  const openEdit = (s: AdminSnack) => {
    setEditing(s);
    setForm({
      name: s.name,
      description: s.description || "",
      price: String(s.price),
      quantity: String(s.quantity),
      emoji: s.emoji || "🍿",
      category: s.category || "other",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return toast.error("Name is required");
    const price = parseFloat(form.price);
    const quantity = parseInt(form.quantity, 10);
    if (isNaN(price) || price < 0) return toast.error("Valid price required");
    if (isNaN(quantity) || quantity < 0) return toast.error("Valid quantity required");

    setSaving(true);
    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      price,
      quantity,
      emoji: form.emoji,
      category: form.category,
    };

    const { error } = editing
      ? await supabase.from("snacks").update(payload).eq("id", editing.id)
      : await supabase.from("snacks").insert({ ...payload, sort_order: snacks.length });

    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(editing ? "Snack updated!" : "Snack added!");
    setDialogOpen(false);
    load();
  };

  const handleDelete = async (s: AdminSnack) => {
    if (!confirm(`Delete "${s.name}"?`)) return;
    const { error } = await supabase.from("snacks").delete().eq("id", s.id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    load();
  };

  const adjustQty = async (s: AdminSnack, delta: number) => {
    const newQty = Math.max(0, s.quantity + delta);
    if (newQty === s.quantity) return;
    const { error } = await supabase.from("snacks").update({ quantity: newQty }).eq("id", s.id);
    if (error) return toast.error(error.message);
    if (delta < 0) toast.success(`Sold 1 ${s.name} ${s.emoji || ""}`);
    load();
  };

  const toggleStock = async (s: AdminSnack, inStock: boolean) => {
    const newQty = inStock ? Math.max(1, s.quantity) : 0;
    const { error } = await supabase.from("snacks").update({ quantity: newQty }).eq("id", s.id);
    if (error) return toast.error(error.message);
    load();
  };

  const persistOrder = async (ordered: AdminSnack[]) => {
    // Update each row with its new sort_order. Optimistic UI already applied.
    const updates = ordered.map((s, i) =>
      supabase.from("snacks").update({ sort_order: i }).eq("id", s.id)
    );
    const results = await Promise.all(updates);
    const failed = results.find((r) => r.error);
    if (failed?.error) {
      toast.error("Failed to save new order");
      load();
    }
  };

  const handleDragEnd = (category: SnackCategory) => (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const inCat = snacks.filter((s) => s.category === category);
    const oldIndex = inCat.findIndex((s) => s.id === active.id);
    const newIndex = inCat.findIndex((s) => s.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reorderedCat = arrayMove(inCat, oldIndex, newIndex);

    // Rebuild full snack list preserving category order; flatten in CATEGORIES order.
    const others = snacks.filter((s) => s.category !== category);
    const merged = [...others, ...reorderedCat];

    // Sort by category order to keep stable cross-category sort_order baseline.
    const catOrder = new Map(CATEGORIES.map((c, i) => [c.value, i]));
    const finalList = [...merged].sort((a, b) => {
      const ca = catOrder.get(a.category) ?? 99;
      const cb = catOrder.get(b.category) ?? 99;
      if (ca !== cb) return ca - cb;
      // Within same category, preserve current order
      const aList = a.category === category ? reorderedCat : others.filter((x) => x.category === a.category);
      const bList = b.category === category ? reorderedCat : others.filter((x) => x.category === b.category);
      return aList.findIndex((x) => x.id === a.id) - bList.findIndex((x) => x.id === b.id);
    });

    setSnacks(finalList);
    persistOrder(finalList);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-2xl">Manage snacks</h2>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNew}>
              <Plus className="mr-2 h-4 w-4" /> Add Snack
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? "Edit Snack" : "New Snack"}</DialogTitle>
            </DialogHeader>
            <SnackForm
              form={form}
              setForm={setForm}
              onCancel={() => setDialogOpen(false)}
              onSave={handleSave}
              saving={saving}
            />
          </DialogContent>
        </Dialog>
      </div>

      {snacks.length === 0 ? (
        <div className="rounded-3xl border-2 border-dashed border-border bg-card p-10 text-center">
          <div className="text-5xl">🛒</div>
          <p className="mt-3 font-semibold">No snacks yet — add your first one!</p>
        </div>
      ) : (
        <div className="space-y-8">
          {CATEGORIES.map((cat) => {
            const items = snacks.filter((s) => s.category === cat.value);
            if (items.length === 0) return null;
            return (
              <section key={cat.value}>
                <h3 className="mb-3 flex items-center gap-2 font-display text-xl">
                  <span>{cat.emoji}</span> {cat.label}
                  <span className="text-sm font-normal text-muted-foreground">({items.length})</span>
                </h3>
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd(cat.value)}
                >
                  <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      {items.map((s) => (
                        <SortableSnackCard
                          key={s.id}
                          snack={s}
                          onAdjustQty={adjustQty}
                          onToggleStock={toggleStock}
                          onEdit={openEdit}
                          onDelete={handleDelete}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              </section>
            );
          })}
        </div>
      )}

      <p className="mt-4 text-xs text-muted-foreground">
        💡 Tip: drag the <span className="font-semibold">⋮⋮</span> handle to reorder snacks within a category. Selling 1 (minus button) auto-logs to your sales history.
      </p>
    </div>
  );
};
