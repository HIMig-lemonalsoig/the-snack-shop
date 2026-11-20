import { useCallback, useEffect, useState } from "react";
import { GlassIconReveal } from "@/components/ui/liquid-glass-logo-reveal";

const SEEN_KEY = "snack-splash-seen";
/** Matches the site's cream background (--background: 42 100% 97%). */
const BG = "#fffbf0";
/** Never block the site longer than this, whatever happens. */
const MAX_MS = 9000;

const shouldShow = () => {
  if (typeof window === "undefined") return false;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
  // Opened in a background tab: browsers pause animation there, so skip the splash.
  if (document.visibilityState === "hidden") return false;
  try {
    return sessionStorage.getItem(SEEN_KEY) !== "1";
  } catch {
    return true;
  }
};

/**
 * Full-screen liquid-glass reveal of the bird logo, shown once per browser
 * session when the site first opens. Skippable by click, Escape, or the
 * Skip button; skipped entirely for people who prefer reduced motion.
 */
export function SplashReveal() {
  const [show, setShow] = useState(shouldShow);
  const [leaving, setLeaving] = useState(false);
  const [wordmark, setWordmark] = useState(false);

  const finish = useCallback(() => {
    setLeaving(true);
    try { sessionStorage.setItem(SEEN_KEY, "1"); } catch { /* ignore */ }
    window.setTimeout(() => setShow(false), 550);
  }, []);

  useEffect(() => {
    if (!show) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const safety = window.setTimeout(finish, MAX_MS);
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") finish(); };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.clearTimeout(safety);
      window.removeEventListener("keydown", onKey);
    };
  }, [show, finish]);

  if (!show) return null;

  return (
    <div
      className="fixed inset-0 z-[100] transition-opacity duration-500 ease-out"
      style={{ backgroundColor: BG, opacity: leaving ? 0 : 1, pointerEvents: leaving ? "none" : "auto" }}
      aria-live="polite"
    >
      <GlassIconReveal
        logo="/logo.png"
        label="The Snack Shop logo"
        look="light"
        background={BG}
        originalColors
        loop={false}
        replayOnClick={false}
        tileSize={300}
        logoScale={0.66}
        finalScale={0.78}
        tuning={{ corner: 2.6, startZoom: 2.2, present: 2.6 }}
        onComplete={() => { setWordmark(true); window.setTimeout(finish, 1300); }}
        onClick={finish}
        className="h-full w-full"
      />
      <p
        className="pointer-events-none absolute inset-x-0 top-[calc(50%+min(32vw,190px))] text-center font-display text-3xl font-bold tracking-tight text-foreground transition-all duration-700 ease-out md:text-4xl"
        style={{ opacity: wordmark ? 1 : 0, transform: wordmark ? "translateY(0)" : "translateY(10px)" }}
      >
        The Snack Shop
      </p>
      <button
        type="button"
        onClick={finish}
        className="absolute bottom-[calc(24px+env(safe-area-inset-bottom))] right-6 min-h-11 rounded-full border-2 border-border bg-card/80 px-5 text-sm font-bold text-foreground backdrop-blur hover:bg-card"
      >
        Skip
      </button>
    </div>
  );
}
