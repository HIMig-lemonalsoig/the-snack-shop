import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Pencil, Trash2, Plus, Minus, GripVertical } from "lucide-react";
import { formatUSD } from "@/lib/format";
import { SnackCategory } from "@/lib/categories";

export interface AdminSnack {
  id: string;
  name: string;
  description: string | null;
  price: number;
  quantity: number;
  emoji: string | null;
  sort_order: number;
  category: SnackCategory;
}

interface Props {
  snack: AdminSnack;
  onAdjustQty: (s: AdminSnack, delta: number) => void;
  onToggleStock: (s: AdminSnack, inStock: boolean) => void;
  onEdit: (s: AdminSnack) => void;
  onDelete: (s: AdminSnack) => void;
}

export const SortableSnackCard = ({ snack, onAdjustQty, onToggleStock, onEdit, onDelete }: Props) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: snack.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const inStock = snack.quantity > 0;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="rounded-3xl border-2 border-border bg-card p-5 shadow-card"
    >
      <div className="flex items-start gap-3">
        <button
          {...attributes}
          {...listeners}
          className="touch-none cursor-grab rounded-lg p-1 text-muted-foreground hover:bg-muted active:cursor-grabbing"
          aria-label="Drag to reorder"
        >
          <GripVertical className="h-5 w-5" />
        </button>
        <div className="text-4xl">{snack.emoji || "🍿"}</div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-display text-lg truncate">{snack.name}</h3>
            {inStock ? (
              <Badge className="bg-success text-success-foreground hover:bg-success">In Stock</Badge>
            ) : (
              <Badge variant="destructive">Sold Out</Badge>
            )}
          </div>
          {snack.description && <p className="text-xs text-muted-foreground line-clamp-1">{snack.description}</p>}
          <div className="mt-1 text-sm font-bold text-primary">{formatUSD(snack.price)}</div>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 rounded-2xl bg-muted p-1">
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => onAdjustQty(snack, -1)} disabled={snack.quantity === 0}>
            <Minus className="h-4 w-4" />
          </Button>
          <span className="min-w-[2rem] text-center font-bold">{snack.quantity}</span>
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => onAdjustQty(snack, 1)}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 text-xs">
            <span>Stock</span>
            <Switch checked={inStock} onCheckedChange={(c) => onToggleStock(snack, c)} />
          </div>
          <Button size="icon" variant="ghost" onClick={() => onEdit(snack)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="ghost" onClick={() => onDelete(snack)}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </div>
    </div>
  );
};
