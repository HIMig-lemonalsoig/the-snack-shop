import { Flame, PackageCheck, PackageX } from "lucide-react";
import { formatUSD } from "@/lib/format";
import { categoryLabel, categoryTile, type SnackCategory } from "@/lib/categories";
import { cn } from "@/lib/utils";

export interface PublicSnack {
  id: string;
  name: string;
  description: string | null;
  price: number;
  quantity: number;
  emoji: string | null;
  category: SnackCategory;
}

/** Stock status always pairs an icon + text with colour, never colour alone. */
function StockLabel({ quantity }: { quantity: number }) {
  if (quantity === 0) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground">
        <PackageX className="h-3.5 w-3.5" aria-hidden /> Sold out
      </span>
    );
  }
  if (quantity <= 3) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-destructive/10 px-2.5 py-1 text-xs font-bold text-destructive">
        <Flame className="h-3.5 w-3.5" aria-hidden />
        {quantity === 1 ? "Last one!" : `Only ${quantity} left`}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-success-strong">
      <PackageCheck className="h-3.5 w-3.5" aria-hidden />
      {quantity > 20 ? "Plenty in stock" : `${quantity} in stock`}
    </span>
  );
}

export const PublicSnackCard = ({ snack }: { snack: PublicSnack }) => {
  const soldOut = snack.quantity === 0;
  return (
    <article
      className={cn(
        "group relative flex gap-4 rounded-3xl border border-border bg-card p-4 shadow-card transition-[transform,box-shadow] duration-200 sm:flex-col sm:p-5",
        soldOut ? "opacity-70 saturate-50" : "hover:-translate-y-0.5 hover:shadow-soft",
      )}
      aria-label={`${snack.name}, ${formatUSD(snack.price)}${soldOut ? ", sold out" : ""}`}
    >
      <div
        className={cn(
          "flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl text-5xl sm:h-28 sm:w-full sm:text-6xl",
          categoryTile(snack.category),
        )}
        aria-hidden
      >
        <span className="transition-transform duration-300 group-hover:scale-110 motion-reduce:transform-none">
          {snack.emoji || "🍿"}
        </span>
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{categoryLabel(snack.category)}</p>
        <h3 className="mt-0.5 font-display text-xl leading-tight text-foreground sm:text-2xl">{snack.name}</h3>
        {snack.description && (
          <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-muted-foreground">{snack.description}</p>
        )}
        <div className="mt-auto flex flex-wrap items-end justify-between gap-2 pt-3">
          <span className="font-display text-2xl font-bold tabular-nums text-foreground">{formatUSD(snack.price)}</span>
          <StockLabel quantity={snack.quantity} />
        </div>
      </div>
    </article>
  );
};
