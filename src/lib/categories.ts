import { Candy, Cookie, CupSoda, Popcorn, Sandwich, type LucideIcon } from "lucide-react";

export type SnackCategory = "drinks" | "chips" | "candy" | "cookies" | "other";

export const CATEGORIES: {
  value: SnackCategory;
  label: string;
  emoji: string;
  icon: LucideIcon;
  /** Tailwind classes for the product tile background on the public menu. */
  tile: string;
}[] = [
  { value: "drinks", label: "Drinks", emoji: "🥤", icon: CupSoda, tile: "bg-sky-100 dark:bg-sky-950/60" },
  { value: "chips", label: "Chips", emoji: "🥨", icon: Sandwich, tile: "bg-amber-100 dark:bg-amber-950/60" },
  { value: "candy", label: "Candy", emoji: "🍬", icon: Candy, tile: "bg-pink-100 dark:bg-pink-950/60" },
  { value: "cookies", label: "Cookies", emoji: "🍪", icon: Cookie, tile: "bg-orange-100 dark:bg-orange-950/60" },
  { value: "other", label: "Other", emoji: "🍿", icon: Popcorn, tile: "bg-violet-100 dark:bg-violet-950/60" },
];

const find = (c: SnackCategory) => CATEGORIES.find((x) => x.value === c) ?? CATEGORIES[CATEGORIES.length - 1];

export const categoryLabel = (c: SnackCategory) => find(c).label;
export const categoryEmoji = (c: SnackCategory) => find(c).emoji;
export const categoryTile = (c: SnackCategory) => find(c).tile;
