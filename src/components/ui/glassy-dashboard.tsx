/**
 * Glassy dashboard primitives.
 *
 * Adapted from the "glassy-dashboard" component: the original shipped a single
 * monolithic demo with hard-coded sample data. Here the visual system (glass
 * shell, dock, panels, metrics, charts, dialogs) is split into small,
 * data-driven pieces so the admin area can feed it real Supabase data.
 *
 * No external images or network assets are used (the background is pure CSS),
 * which keeps the admin area compatible with a strict Content-Security-Policy.
 */
import {
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
  type ReactNode,
} from "react";
import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { ArrowDownRight, ArrowUpRight, Moon, Search, Sun, X, type LucideIcon } from "lucide-react";
import "@fontsource-variable/manrope";

gsap.registerPlugin(useGSAP);

/* ------------------------------------------------------------------ styles */

export const glassyStyles = `
.gd-app {
  --gd-ink: #25201e; --gd-muted: #4a3d36; --gd-line: rgb(74 49 33 / 15%); --gd-grid: rgb(74 49 33 / 17%);
  --gd-rim: rgb(255 253 246 / 51%); --gd-edge-light: rgb(255 254 247 / 84%); --gd-edge-shade: rgb(57 40 28 / 19%);
  --gd-gloss: rgb(255 251 242 / 45%); --gd-frame: rgb(247 234 219 / 30%); --gd-rail: rgb(241 222 206 / 55%);
  --gd-card: rgb(250 242 232 / 55%); --gd-card-light: rgb(255 251 245 / 34%); --gd-raised: rgb(255 249 243 / 85%);
  --gd-inner: rgb(255 250 245 / 42%); --gd-surface: #f6ece2; --gd-track: rgb(81 49 32 / 14%);
  --gd-primary: #261e1b; --gd-primary-ink: #fffaf5; --gd-pick: #fff9f3; --gd-pick-ink: #241b17;
  --gd-coral: #b23a22; --gd-teal: #0a6650; --gd-ochre: #8f5c00; --gd-graph-ink: #40332d; --gd-focus: #194b48;
  --gd-dark-shadow: 35 21 14;
  position: relative; isolation: isolate; min-block-size: 100dvh; inline-size: 100%;
  background: #b0907a; color: var(--gd-ink); color-scheme: light;
  font-family: "Manrope Variable", Manrope, system-ui, sans-serif; font-size: 14px; font-weight: 550;
  font-variant-numeric: tabular-nums;
}
.gd-app[data-theme="dark"] {
  --gd-ink: #fff6e9; --gd-muted: #e5d5c7; --gd-line: rgb(243 221 198 / 19%); --gd-grid: rgb(243 221 198 / 17%);
  --gd-rim: rgb(255 236 212 / 26%); --gd-edge-light: rgb(255 242 225 / 40%); --gd-edge-shade: rgb(11 6 5 / 30%);
  --gd-gloss: rgb(255 237 213 / 10%); --gd-frame: rgb(42 31 29 / 58%); --gd-rail: rgb(45 32 30 / 66%);
  --gd-card: rgb(47 36 34 / 62%); --gd-card-light: rgb(106 88 81 / 26%); --gd-raised: rgb(80 67 61 / 88%);
  --gd-inner: rgb(78 61 56 / 52%); --gd-surface: #3b302c; --gd-track: rgb(245 226 212 / 16%);
  --gd-primary: #f3ddca; --gd-primary-ink: #231a16; --gd-pick: #f9eee0; --gd-pick-ink: #241b17;
  --gd-coral: #ff9177; --gd-teal: #75dac0; --gd-ochre: #f1be58; --gd-graph-ink: #e7d9cd; --gd-focus: #f9bf9b;
  --gd-dark-shadow: 10 4 3; background: #3a2d27; color-scheme: dark;
}
.gd-app *, .gd-app *::before, .gd-app *::after { box-sizing: border-box; }
.gd-app :where(button, a, input, select):focus-visible { outline: 2px solid var(--gd-focus); outline-offset: 3px; }
.gd-app button { cursor: pointer; }
.gd-app :is(h1, h2, h3, h4) { font-family: inherit; }
.gd-sr { position: absolute; inline-size: 1px; block-size: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }

/* CSS-only scene: warm caramel + strawberry light, no remote image */
.gd-app::before, .gd-app::after { content: ""; position: fixed; inset: 0; pointer-events: none; }
.gd-app::before {
  z-index: -2;
  background:
    radial-gradient(60% 55% at 12% 8%, #f6c9a4 0%, transparent 62%),
    radial-gradient(48% 50% at 92% 18%, #e98d7a 0%, transparent 60%),
    radial-gradient(70% 60% at 70% 100%, #8a5a3c 0%, transparent 65%),
    radial-gradient(50% 45% at 20% 95%, #c98f62 0%, transparent 60%),
    linear-gradient(150deg, #d9b291, #a67759 55%, #6f4a35);
}
.gd-app::after {
  z-index: -1; opacity: .35;
  background-image: radial-gradient(rgb(255 255 255 / 22%) 1px, transparent 1.4px);
  background-size: 22px 22px;
}
.gd-app[data-theme="dark"]::before { filter: brightness(.42) saturate(.85); }
.gd-app[data-theme="dark"]::after { opacity: .12; }

.gd-surround { inline-size: min(calc(100% - 100px), 1380px); margin-inline: auto; padding-block: 24px 8px; }
.gd-top, .gd-dock {
  border: 1px solid var(--gd-rim);
  background: linear-gradient(165deg, var(--gd-gloss), transparent 32% 73%, var(--gd-gloss)), var(--gd-rail);
  box-shadow: inset 1px 1px 1px var(--gd-edge-light), inset -1px -1px 1px var(--gd-edge-shade), 0 7px 20px rgb(var(--gd-dark-shadow) / 17%);
  backdrop-filter: blur(15px) saturate(1.35); -webkit-backdrop-filter: blur(15px) saturate(1.35);
}
.gd-top {
  display: grid; grid-template-columns: minmax(0, 1fr) minmax(220px, 380px) minmax(0, 1fr); align-items: center;
  gap: 12px; min-block-size: 60px; border-radius: 999px; padding: 6px 9px 6px 13px;
}
.gd-brand { display: flex; align-items: center; gap: 10px; min-inline-size: 0; }
.gd-logo { inline-size: 38px; block-size: 38px; display: grid; place-items: center; border-radius: 50%;
  background: var(--gd-pick); color: var(--gd-pick-ink); box-shadow: 0 2px 7px rgb(var(--gd-dark-shadow) / 12%); }
.gd-logo svg { width: 20px; height: 20px; }
.gd-logo img { display: block; }
.gd-brand strong { display: block; font-size: 12px; letter-spacing: .16em; font-weight: 850; text-transform: uppercase; }
.gd-brand small { display: block; margin-block-start: 3px; font-size: 11px; color: var(--gd-muted);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.gd-ask { display: flex; align-items: center; gap: 10px; min-block-size: 44px; border: 1px solid var(--gd-line);
  border-radius: 999px; background: var(--gd-inner); padding: 4px 14px; text-align: start; color: var(--gd-muted); font: inherit; font-size: 12.5px; }
.gd-ask:hover, .gd-icon-button:hover { background: var(--gd-raised); }
.gd-ask svg { width: 15px; height: 15px; }
.gd-ask kbd { margin-inline-start: auto; font: inherit; font-size: 10px; border: 1px solid var(--gd-line); border-radius: 6px; padding: 1px 6px; }
.gd-top-actions { display: flex; justify-content: flex-end; gap: 6px; }
.gd-icon-button { position: relative; min-inline-size: 44px; min-block-size: 44px; display: inline-grid; place-items: center;
  border-radius: 999px; border: 1px solid var(--gd-line); padding: 0; background: var(--gd-inner); color: inherit; }
.gd-icon-button svg { width: 17px; height: 17px; stroke-width: 1.75; }
.gd-icon-button .gd-dot { position: absolute; inset: 8px 8px auto auto; min-inline-size: 16px; block-size: 16px; border-radius: 999px;
  background: var(--gd-coral); color: #fff; font-size: 9.5px; font-weight: 850; display: grid; place-items: center; padding-inline: 4px;
  box-shadow: 0 0 0 2px var(--gd-surface); translate: 40% -40%; }

.gd-stage-wrap { position: relative; margin-block: 11px 0; }
.gd-stage {
  border: 1px solid var(--gd-rim); border-radius: 34px;
  background: linear-gradient(148deg, var(--gd-gloss), transparent 19% 77%), var(--gd-frame);
  box-shadow: inset 1px 1px 1px var(--gd-edge-light), inset -1px -1px 1px var(--gd-edge-shade), 0 22px 72px rgb(var(--gd-dark-shadow) / 22%);
  backdrop-filter: blur(var(--gd-panel-frost, 14px)) saturate(1.24); -webkit-backdrop-filter: blur(var(--gd-panel-frost, 14px)) saturate(1.24);
}
.gd-stage-scroll { min-block-size: max(605px, calc(100dvh - 165px)); border-radius: inherit;
  padding: clamp(19px, 2.15vw, 35px) clamp(25px, 3.2vw, 49px) 56px; }
.gd-view-head { display: flex; align-items: flex-end; justify-content: space-between; gap: 12px 22px; margin-block-end: 19px; flex-wrap: wrap; }
.gd-view-head h1 { font-size: clamp(29px, 3.35vw, 46px); font-weight: 760; line-height: 1.03; letter-spacing: -.055em; margin: 0; }
.gd-view-head p { color: var(--gd-muted); font-size: 13px; margin: 8px 0 0; }
.gd-view-actions { display: flex; align-items: center; flex-wrap: wrap; gap: 7px; }
.gd-period { display: inline-flex; padding: 3px; border-radius: 999px; border: 1px solid var(--gd-rim); background: var(--gd-inner); }
.gd-period button { min-block-size: 38px; min-inline-size: 58px; border: 0; border-radius: 999px; background: transparent; color: inherit;
  padding: 0 12px; font: inherit; font-size: 11.5px; font-weight: 750; white-space: nowrap; transition: background .2s; }
.gd-period button[aria-pressed="true"] { background: var(--gd-primary); color: var(--gd-primary-ink); }
.gd-primary, .gd-secondary { display: inline-flex; justify-content: center; align-items: center; gap: 7px; min-block-size: 42px;
  padding: 7px 14px; font: inherit; font-size: 12px; font-weight: 790; border-radius: 999px; border: 1px solid transparent; white-space: nowrap; }
.gd-primary { background: var(--gd-primary); color: var(--gd-primary-ink); }
.gd-secondary { background: var(--gd-raised); border-color: var(--gd-rim); color: var(--gd-ink); }
.gd-primary:hover { filter: brightness(1.17); }
.gd-secondary:hover { background: var(--gd-surface); }
.gd-primary:disabled { opacity: .45; cursor: not-allowed; }
.gd-primary svg, .gd-secondary svg { width: 14px; height: 14px; }

.gd-grid { display: grid; gap: 12px; }
.gd-grid-hero { grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr); }
.gd-grid-main { grid-template-columns: minmax(0, 1.75fr) minmax(0, 1fr); }
.gd-metric-grid { display: grid; gap: 8px; grid-template-columns: repeat(2, minmax(0, 1fr)); }
.gd-metric-grid[data-cols="4"] { grid-template-columns: repeat(4, minmax(0, 1fr)); }

.gd-panel, .gd-metric { min-inline-size: 0; border: 1px solid var(--gd-rim); border-radius: 20px;
  background: linear-gradient(144deg, var(--gd-card-light), transparent 66%), var(--gd-card);
  box-shadow: inset 0 1px 1px var(--gd-edge-light), inset 0 -1px 1px var(--gd-edge-shade), 0 6px 18px rgb(var(--gd-dark-shadow) / 9%); }
.gd-panel { padding: 16px 18px; }
.gd-panel-head { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: flex-start; gap: 7px 12px; margin-block-end: 12px; }
.gd-panel-head h2 { font-size: 15px; font-weight: 810; letter-spacing: -.02em; margin: 0; }
.gd-panel-head p { font-size: 11.5px; color: var(--gd-muted); margin: 3px 0 0; }
.gd-metric { display: flex; flex-direction: column; justify-content: space-between; min-block-size: 112px; padding: 12px 13px; }
.gd-metric[data-tone="teal"] { --gd-coral: #ffc8b8; --gd-teal: #b8f1dd; --gd-muted: #e4f5ef; color: #fff; border-color: rgb(196 248 231 / 55%);
  background: radial-gradient(ellipse at 5% -20%, #3a9381, transparent 68%), linear-gradient(145deg, #1e7461, #08443a); }
.gd-metric[data-tone="coral"] { --gd-muted: #ffe9e2; --gd-teal: #fff; color: #fff; border-color: rgb(255 214 200 / 55%);
  background: radial-gradient(ellipse at 5% -20%, #e0785e, transparent 68%), linear-gradient(145deg, #b4472e, #7d2a18); }
.gd-metric-head { display: flex; justify-content: space-between; align-items: center; gap: 4px; font-size: 11.5px; font-weight: 740; }
.gd-metric-icon, .gd-list-icon { display: grid; place-items: center; flex: none; inline-size: 30px; block-size: 30px; border-radius: 10px;
  background: var(--gd-inner); box-shadow: inset 0 1px 0 var(--gd-gloss); }
.gd-metric-icon svg, .gd-list-icon svg { width: 15px; height: 15px; }
.gd-metric[data-tone] .gd-metric-icon { background: rgb(255 255 255 / 16%); }
.gd-metric-value { display: block; font-size: clamp(22px, 2.35vw, 34px); line-height: 1.05; margin-block: 4px 7px; letter-spacing: -.05em; font-weight: 815; }
.gd-metric-caption { display: flex; flex-wrap: wrap; align-items: center; gap: 4px; color: var(--gd-muted); font-size: 11px; font-weight: 680; }
.gd-delta { display: inline-flex; align-items: center; gap: 2px; color: var(--gd-teal); font-weight: 850; border-radius: 6px; padding: 2px 4px;
  background: color-mix(in srgb, var(--gd-teal) 12%, transparent); }
.gd-delta[data-attention="true"] { color: var(--gd-coral); background: color-mix(in srgb, var(--gd-coral) 11%, transparent); }
.gd-delta svg { width: 11px; height: 11px; stroke-width: 2.4; }
.gd-big-number { font-size: clamp(32px, 4vw, 58px); font-weight: 820; letter-spacing: -.07em; line-height: 1.02; }

.gd-table-tools { display: flex; flex-wrap: wrap; align-items: center; gap: 7px; }
.gd-search, .gd-filter { display: inline-flex; align-items: center; gap: 6px; border: 1px solid var(--gd-line); border-radius: 10px;
  background: var(--gd-inner); min-block-size: 38px; padding: 0 9px; }
.gd-search svg, .gd-filter svg { width: 13px; height: 13px; color: var(--gd-muted); }
.gd-search input { width: 140px; flex: 1; min-inline-size: 0; border: 0; background: transparent; min-block-size: 36px; font: inherit; font-size: 12px; color: inherit; }
.gd-search input::placeholder { color: var(--gd-muted); opacity: 1; }
.gd-search input:focus-visible { outline: none; }
.gd-search:focus-within { outline: 2px solid var(--gd-focus); }
.gd-table-scroll { max-inline-size: 100%; overflow: auto; }
.gd-table-scroll table { inline-size: 100%; border-spacing: 0; }
.gd-table-scroll th, .gd-table-scroll td { padding: 10px; text-align: start; }
.gd-table-scroll th { background: var(--gd-inner); font-size: 10.5px; color: var(--gd-muted); font-weight: 800; text-transform: uppercase; letter-spacing: .04em; }
.gd-table-scroll th:first-child { border-radius: 8px 0 0 8px; }
.gd-table-scroll th:last-child { border-radius: 0 8px 8px 0; }
.gd-table-scroll td { white-space: nowrap; font-size: 12px; }
.gd-table-scroll td:first-child { font-weight: 750; }
.gd-table-scroll tr + tr td { border-top: 1px solid var(--gd-line); }
.gd-num { text-align: end !important; }
.gd-status { --gd-status-color: var(--gd-graph-ink); display: inline-flex; align-items: center; gap: 5px; padding: 4px 7px; border-radius: 999px;
  font-size: 10.5px; font-weight: 790; background: color-mix(in srgb, var(--gd-status-color) 12%, var(--gd-inner)); color: var(--gd-status-color); white-space: nowrap; }
.gd-status[data-state="teal"] { --gd-status-color: var(--gd-teal); }
.gd-status[data-state="coral"] { --gd-status-color: var(--gd-coral); }
.gd-status[data-state="ochre"] { --gd-status-color: var(--gd-ochre); }
.gd-status i { inline-size: 6px; block-size: 6px; border-radius: 50%; background: currentColor; }
.gd-empty { padding: 14px 3px; color: var(--gd-muted); font-size: 12.5px; margin: 0; }

.gd-app [data-tone="ink"] { --gd-series: var(--gd-graph-ink); }
.gd-app [data-tone="coral"] { --gd-series: var(--gd-coral); }
.gd-app [data-tone="teal"] { --gd-series: var(--gd-teal); }
.gd-app [data-tone="ochre"] { --gd-series: var(--gd-ochre); }
.gd-legend { display: inline-flex; flex-wrap: wrap; align-items: center; gap: 6px 12px; color: var(--gd-muted); }
.gd-legend span { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; font-weight: 740; }
.gd-legend i { inline-size: 8px; block-size: 8px; border-radius: 50%; background: var(--gd-series); }
.gd-legend i[data-dashed="true"] { border-radius: 2px; block-size: 3px; inline-size: 12px; }

.gd-stack-meta { display: flex; justify-content: space-between; align-items: center; min-height: 20px; gap: 4px; }
.gd-chart-readout { font-size: 11px; font-weight: 830; white-space: nowrap; }
.gd-stack-plot { display: grid; grid-template-columns: repeat(var(--gd-series-count), minmax(0, 1fr)); gap: 3px; block-size: 180px; margin-top: 6px; }
.gd-stack-column { display: flex; flex-direction: column; align-items: center; min-inline-size: 0; border: 0; border-radius: 8px; background: transparent; padding: 3px 0 0; color: inherit; }
.gd-stack-column:is(:focus-visible, :hover, [aria-pressed="true"]) { background: var(--gd-inner); }
.gd-stack-track { display: flex; justify-content: center; align-items: end; flex: 1; inline-size: 100%; border-bottom: 1px solid var(--gd-line); }
.gd-stack-bar { display: flex; flex-direction: column-reverse; transform-origin: center bottom; inline-size: min(65%, 38px); min-inline-size: 5px;
  border-radius: 6px 6px 3px 3px; overflow: hidden; }
.gd-stack-bar i { display: block; flex-basis: 0; background: var(--gd-series); }
.gd-stack-bar i:last-child { background: repeating-linear-gradient(138deg, var(--gd-series) 0 4px, color-mix(in srgb, var(--gd-series) 76%, white) 4px 6px); }
.gd-stack-label { font-size: 9.5px; color: var(--gd-muted); margin-top: 7px; white-space: nowrap; min-block-size: 12px; }

.gd-revenue-main { display: grid; grid-template-columns: 46px minmax(0, 1fr); }
.gd-chart-y { display: flex; flex-direction: column; justify-content: space-between; font-size: 10px; color: var(--gd-muted); }
.gd-line-plot { position: relative; min-inline-size: 0; block-size: 210px; }
.gd-line-plot svg { display: block; width: 100%; height: 100%; overflow: visible; }
.gd-grid-line { stroke: var(--gd-grid); stroke-dasharray: 3 4; vector-effect: non-scaling-stroke; }
.gd-chart-path { fill: none; stroke: var(--gd-series); stroke-width: 2.5; stroke-linecap: round; vector-effect: non-scaling-stroke; }
.gd-chart-path[data-dashed="true"] { stroke-dasharray: 5 5; stroke-width: 1.8; opacity: .8; }
.gd-line-cursor { stroke: var(--gd-muted); stroke-dasharray: 2 4; vector-effect: non-scaling-stroke; }
.gd-chart-zones { position: absolute; inset: 0; display: flex; }
.gd-chart-zones button { flex: 1; min-inline-size: 0; border: 0; background: transparent; padding: 0; }
.gd-line-tooltip { pointer-events: none; position: absolute; top: 6px; left: clamp(70px, var(--gd-tooltip-x), calc(100% - 70px)); translate: -50% 0;
  display: grid; gap: 3px; min-inline-size: 140px; padding: 8px 9px; background: var(--gd-surface); border: 1px solid var(--gd-line);
  border-radius: 9px; font-size: 11px; box-shadow: 0 4px 10px rgb(var(--gd-dark-shadow) / 15%); }
.gd-line-tooltip span { display: flex; justify-content: space-between; gap: 10px; }
.gd-chart-axis { display: flex; justify-content: space-between; margin: 9px 0 0 46px; font-size: 10px; color: var(--gd-muted); }

.gd-donut { display: grid; gap: 10px; }
.gd-donut-ring { position: relative; inline-size: min(100%, 156px); aspect-ratio: 1; justify-self: center; }
.gd-donut-ring svg { display: block; inline-size: 100%; block-size: 100%; }
.gd-donut-segment { stroke: var(--gd-series); transition: opacity .2s ease; }
.gd-donut-segment[data-muted="true"] { opacity: .25; }
.gd-donut-total { position: absolute; inset: 0; display: flex; flex-direction: column; justify-content: center; align-items: center; pointer-events: none; text-align: center; }
.gd-donut-total strong { font-size: 21px; letter-spacing: -.05em; font-weight: 850; }
.gd-donut-total span { font-size: 10.5px; margin-top: 4px; color: var(--gd-muted); }
.gd-donut-list { display: grid; gap: 2px; }
.gd-donut-list button { display: grid; grid-template-columns: 82px minmax(0, 1fr) 40px; gap: 8px; align-items: center; min-block-size: 34px;
  text-align: start; background: transparent; border: 0; border-radius: 8px; padding: 3px 6px; color: inherit; font: inherit; font-size: 11.5px; }
.gd-donut-list button:is(:hover, [aria-pressed="true"]) { background: var(--gd-inner); }
.gd-donut-list button > span:first-child { display: inline-flex; align-items: center; gap: 6px; font-weight: 740; }
.gd-donut-list button > span:first-child i { inline-size: 8px; block-size: 8px; border-radius: 50%; background: var(--gd-series); }
.gd-donut-list strong { text-align: end; font-weight: 850; }
.gd-mix-track { display: block; height: 5px; border-radius: 999px; overflow: hidden; background: var(--gd-track); }
.gd-fill { display: block; block-size: 100%; border-radius: inherit; background: var(--gd-series, var(--gd-teal)); transform-origin: left center; }

.gd-lanes { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 9px; }
.gd-lane { min-inline-size: 0; border: 1px solid var(--gd-line); background: var(--gd-inner); padding: 8px; border-radius: 14px; }
.gd-lane header { display: flex; align-items: center; gap: 6px; padding: 3px 4px 8px; }
.gd-lane header i { display: inline-grid; place-items: center; border-radius: 7px; width: 24px; height: 24px; color: var(--gd-series);
  background: color-mix(in srgb, var(--gd-series) 14%, transparent); }
.gd-lane header svg { width: 13px; height: 13px; }
.gd-lane header h3 { font-size: 12px; font-weight: 840; margin: 0; }
.gd-lane header span { margin-inline-start: auto; color: var(--gd-muted); font-size: 11px; font-weight: 800; }
.gd-work-item { display: grid; gap: 4px; width: 100%; text-align: start; border-radius: 11px; padding: 10px; border: 1px solid var(--gd-rim);
  background: var(--gd-card); color: inherit; font: inherit; }
.gd-work-item + .gd-work-item { margin-top: 6px; }
.gd-work-item:hover { background: var(--gd-raised); }
.gd-work-item strong { font-size: 12.5px; font-weight: 820; overflow-wrap: anywhere; }
.gd-work-item span { font-size: 11px; line-height: 1.42; color: var(--gd-muted); overflow-wrap: anywhere; }
.gd-rank { display: grid; gap: 6px; list-style: none; margin: 0; padding: 0; }
.gd-rank li { display: grid; grid-template-columns: 26px minmax(0, 1fr) auto; align-items: center; gap: 10px; padding: 8px 10px; border-radius: 12px; background: var(--gd-inner); }
.gd-rank b { inline-size: 26px; block-size: 26px; border-radius: 50%; display: grid; place-items: center; background: var(--gd-primary); color: var(--gd-primary-ink); font-size: 11px; }
.gd-rank span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 750; }
.gd-rank small { display: block; color: var(--gd-muted); font-size: 10.5px; text-align: end; }

.gd-dock { position: absolute; z-index: 3; display: flex; align-items: center; gap: 3px; padding: 4px; border-radius: 999px; }
.gd-dock-side { flex-direction: column; left: -26px; top: clamp(66px, 16vh, 153px); }
.gd-dock-bottom { position: fixed; left: 50%; bottom: calc(14px + env(safe-area-inset-bottom)); translate: -50% 0; }
.gd-dock a { z-index: 1; position: relative; display: flex; gap: 6px; justify-content: center; align-items: center; min-inline-size: 44px;
  min-block-size: 44px; padding: 0 14px; border-radius: 999px; font-size: 12px; font-weight: 800; white-space: nowrap; color: inherit; text-decoration: none; }
.gd-dock-side a { padding: 0; }
.gd-dock a svg { width: 17px; height: 17px; stroke-width: 1.9; }
.gd-dock a[aria-current="page"] { color: var(--gd-pick-ink); }
.gd-dock a:not([aria-current="page"]):hover { background: var(--gd-inner); }
.gd-dock a .gd-badge { min-inline-size: 18px; block-size: 18px; border-radius: 999px; background: var(--gd-coral); color: #fff; font-size: 10px;
  display: inline-grid; place-items: center; padding-inline: 5px; }
.gd-dock-side a .gd-badge { position: absolute; inset: 2px 2px auto auto; min-inline-size: 15px; block-size: 15px; font-size: 9px; padding-inline: 3px; }
.gd-dock-indicator { position: absolute; inset: 0 auto auto 0; pointer-events: none; visibility: hidden; border-radius: 999px; background: var(--gd-pick);
  box-shadow: inset 0 1px 0 white, 0 2px 7px rgb(var(--gd-dark-shadow) / 16%); }
.gd-dock-indicator[data-ready="true"] { visibility: visible; transition: transform .36s cubic-bezier(.24,.89,.26,1), width .36s cubic-bezier(.24,.89,.26,1), height .36s cubic-bezier(.24,.89,.26,1); }
.gd-dock-side .gd-dock-text, .gd-dock-short { display: none; }
.gd-dock-tip { display: none; position: absolute; left: calc(100% + 8px); z-index: 1; pointer-events: none; color: var(--gd-ink); background: var(--gd-surface);
  padding: 6px 9px; border: 1px solid var(--gd-rim); border-radius: 7px; box-shadow: 0 3px 8px rgb(var(--gd-dark-shadow) / 17%); }
.gd-dock-side a:is(:hover, :focus-visible) .gd-dock-tip { display: inline; }
.gd-footer { padding: 28px 3px 90px; display: flex; justify-content: space-between; align-items: center; gap: 10px; font-size: 11px; }
.gd-footer > * { border-radius: 999px; padding: 5px 10px; background: var(--gd-raised); font-weight: 740; }

.gd-dialog { max-inline-size: min(calc(100% - 26px), 500px); inline-size: 100%; border-radius: 23px; border: 1px solid var(--gd-rim);
  color: var(--gd-ink); padding: 0; background: var(--gd-surface); box-shadow: 0 20px 80px rgb(var(--gd-dark-shadow) / 38%); }
.gd-dialog::backdrop { background: rgb(30 21 17 / 50%); backdrop-filter: blur(5px); }
.gd-dialog-inner { padding: 20px; }
.gd-dialog-inner > header { display: flex; gap: 10px; align-items: center; justify-content: space-between; margin-bottom: 13px; }
.gd-dialog-inner h2 { font-size: 22px; font-weight: 830; letter-spacing: -.04em; margin: 0; overflow-wrap: anywhere; }
.gd-dialog-body { font-size: 13px; line-height: 1.55; color: var(--gd-muted); overflow-wrap: anywhere; }
.gd-dialog-actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 16px; }
.gd-quick-list { display: grid; gap: 5px; }
.gd-quick-list button { display: flex; align-items: center; gap: 10px; width: 100%; padding: 10px; text-align: start; border: 1px solid var(--gd-line);
  border-radius: 10px; background: var(--gd-inner); color: inherit; font: inherit; }
.gd-quick-list button:hover, .gd-quick-list button:focus-visible { background: var(--gd-raised); }
.gd-quick-list button svg { width: 16px; height: 16px; color: var(--gd-muted); flex: none; }
.gd-quick-list button div { flex: 1; min-inline-size: 0; }
.gd-quick-list strong, .gd-quick-list small { display: block; }
.gd-quick-list small { color: var(--gd-muted); margin-top: 2px; font-size: 11.5px; }
.gd-command-input { inline-size: 100%; margin-bottom: 10px; min-block-size: 46px; }
.gd-command-input input { font-size: 15px; }

/* Wrapper for dialogs rendered outside the shell: tokens only, no scene */
.gd-portal { position: static; min-block-size: 0; background: none; }
.gd-portal::before, .gd-portal::after { display: none; }

/* Embedded shadcn management screens sit inside a glass panel */
.gd-embed { padding: clamp(14px, 2vw, 24px); }

@media (max-width: 1060px) {
  .gd-surround { inline-size: calc(100% - 74px); }
  .gd-grid-hero, .gd-grid-main { grid-template-columns: minmax(0, 1fr); }
  .gd-metric-grid[data-cols="4"] { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@media (max-width: 760px) {
  .gd-surround { padding-top: 11px; inline-size: calc(100% - 24px); }
  .gd-top { grid-template-columns: minmax(0, 1fr) auto; padding: 7px 9px; gap: 6px 10px; border-radius: 22px; }
  .gd-ask { grid-area: 2 / 1 / 3 / -1; }
  .gd-ask kbd { display: none; }
  .gd-top-actions { grid-area: 1 / 2; }
  .gd-stage { border-radius: 24px; }
  .gd-stage-scroll { min-block-size: auto; padding: 16px 13px 20px; }
  .gd-lanes { grid-template-columns: minmax(0, 1fr); }
  .gd-dock-side { display: none; }
  .gd-dock-bottom { inset: auto 11px calc(9px + env(safe-area-inset-bottom)); translate: none; justify-content: space-between; }
  .gd-dock-bottom a { flex: 1; flex-direction: column; gap: 2px; padding: 3px 4px; min-block-size: 50px; font-size: 10px; }
  .gd-dock-bottom .gd-dock-text { display: none; }
  .gd-dock-bottom .gd-dock-short { display: inline; }
  .gd-dock-bottom a .gd-badge { position: absolute; inset: 3px 50% auto auto; translate: 22px 0; }
  .gd-footer { padding-bottom: calc(96px + env(safe-area-inset-bottom)); }
}
@media (min-width: 761px) { .gd-dock-bottom { display: none; } }
@media (max-width: 420px) {
  .gd-panel { padding: 13px; }
  .gd-metric-grid, .gd-metric-grid[data-cols="4"] { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); }
  .gd-chart-axis span:nth-child(even) { visibility: hidden; }
}
@media (prefers-reduced-motion: reduce) {
  .gd-app *, .gd-app *::before, .gd-app *::after { animation-duration: .01ms !important; transition-duration: .01ms !important; }
}
@media (prefers-reduced-transparency: reduce), (prefers-contrast: more) {
  .gd-top, .gd-stage, .gd-dock, .gd-panel, .gd-metric { background: var(--gd-surface); backdrop-filter: none; -webkit-backdrop-filter: none; }
}
`;

/* ------------------------------------------------------------- formatting */

const numberFmt = new Intl.NumberFormat("en-US");
const usdFmt = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const usdCompactFmt = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 1 });

export type CountFormat = "number" | "usd" | "compact" | "percent";
export const formatCount: Record<CountFormat, (value: number) => string> = {
  number: (v) => numberFmt.format(Math.round(v)),
  usd: (v) => usdFmt.format(v),
  compact: (v) => usdCompactFmt.format(v),
  percent: (v) => `${v.toFixed(1)}%`,
};

export function Counter({ value, format = "number" }: { value: number; format?: CountFormat }) {
  const text = formatCount[format](value);
  return (
    <>
      <span data-gd-count={value} data-format={format} aria-hidden="true">{text}</span>
      <span className="gd-sr">{text}</span>
    </>
  );
}

/* ------------------------------------------------------------- primitives */

export type ChartTone = "coral" | "ink" | "teal" | "ochre";

export function Legend({ entries }: { entries: { label: string; tone: ChartTone; dashed?: boolean }[] }) {
  return (
    <div className="gd-legend">
      {entries.map(({ label, tone, dashed }) => (
        <span key={label}><i data-tone={tone} data-dashed={dashed} aria-hidden="true" />{label}</span>
      ))}
    </div>
  );
}

export function Panel({ title, subtitle, action, className = "", children }: {
  title: string; subtitle?: string; action?: ReactNode; className?: string; children: ReactNode;
}) {
  return (
    <section className={`gd-panel ${className}`} data-gd-enter>
      <header className="gd-panel-head">
        <div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>
        {action}
      </header>
      {children}
    </section>
  );
}

export function Metric({ title, icon, value, format, change, detail, tone, attention }: {
  title: string; icon: ReactNode; value: number; format?: CountFormat; change?: string | null;
  detail?: string; tone?: "teal" | "coral"; attention?: boolean;
}) {
  const down = change?.startsWith("−") || change?.startsWith("-");
  return (
    <article className="gd-metric" data-tone={tone} data-gd-enter>
      <div className="gd-metric-head"><span>{title}</span><span className="gd-metric-icon" aria-hidden="true">{icon}</span></div>
      <strong className="gd-metric-value"><Counter value={value} format={format} /></strong>
      <div className="gd-metric-caption">
        {change && (
          <span className="gd-delta" data-attention={attention ?? down}>
            {down ? <ArrowDownRight aria-hidden="true" /> : <ArrowUpRight aria-hidden="true" />}{change}
          </span>
        )}
        {detail && <span>{detail}</span>}
      </div>
    </article>
  );
}

export function StatusBadge({ label, state = "ink" }: { label: string; state?: "teal" | "coral" | "ochre" | "ink" }) {
  return <span className="gd-status" data-state={state}><i aria-hidden="true" />{label}</span>;
}

export type StackItem = { label: string; values: number[] };

export function StackChart({ items, series, format, title }: {
  items: StackItem[]; series: { label: string; tone: ChartTone }[]; format: (v: number) => string; title: string;
}) {
  const [active, setActive] = useState<number | null>(null);
  const totals = items.map((i) => i.values.reduce((a, b) => a + b, 0));
  const max = Math.max(1, ...totals) * 1.1;
  const step = Math.max(1, Math.ceil(items.length / 8));
  return (
    <figure className="gd-stack" aria-label={title} style={{ margin: 0 }}>
      <div className="gd-stack-meta">
        <Legend entries={series} />
        {active !== null && <span className="gd-chart-readout">{items[active].label} · {format(totals[active])}</span>}
      </div>
      <div className="gd-stack-plot" style={{ "--gd-series-count": items.length } as CSSProperties} onMouseLeave={() => setActive(null)}>
        {items.map((item, index) => (
          <button type="button" className="gd-stack-column" key={item.label + index}
            aria-label={`${item.label}: ${item.values.map((v, i) => `${format(v)} ${series[i]?.label ?? ""}`).join(", ")}`}
            aria-pressed={active === index}
            onFocus={() => setActive(index)} onBlur={() => setActive(null)}
            onMouseEnter={() => setActive(index)} onClick={() => setActive(index)}>
            <span className="gd-stack-track" aria-hidden="true">
              <span className="gd-stack-bar" style={{ height: `${(totals[index] / max) * 100}%` }}>
                {item.values.map((v, i) => <i key={i} data-tone={series[i]?.tone} style={{ flexGrow: v }} />)}
              </span>
            </span>
            <span className="gd-stack-label" aria-hidden="true">{index % step === 0 ? item.label : ""}</span>
          </button>
        ))}
      </div>
    </figure>
  );
}

type Point = [number, number];
function curve(points: Point[]) {
  return points.reduce((path, [x, y], i) => {
    if (i === 0) return `M ${x} ${y}`;
    const [px, py] = points[i - 1];
    const mx = (x + px) / 2;
    return `${path} C ${mx} ${py}, ${mx} ${y}, ${x} ${y}`;
  }, "");
}

/** Two-series line chart: a solid primary series and a dashed comparison series. */
export function LineChart({ labels, primary, comparison, primaryLabel, comparisonLabel, format, axisFormat, title }: {
  labels: string[]; primary: number[]; comparison: number[]; primaryLabel: string; comparisonLabel: string;
  format: (v: number) => string; axisFormat: (v: number) => string; title: string;
}) {
  const fillId = `gd-fill-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const [active, setActive] = useState<number | null>(null);
  const h = 206, w = 600;
  const rawMax = Math.max(1, ...primary, ...comparison) * 1.12;
  const max = niceCeil(rawMax);
  const toPoints = (vals: number[]): Point[] =>
    vals.map((v, i) => [(i * w) / Math.max(1, vals.length - 1), h - (v / max) * h]);
  const pPts = toPoints(primary);
  const cPts = toPoints(comparison);
  const line = curve(pPts);
  const ticks = [max, max * 0.75, max * 0.5, max * 0.25, 0];
  const axisStep = Math.max(1, Math.ceil(labels.length / 7));
  const pt = active === null ? undefined : pPts[active];
  return (
    <figure aria-label={title} style={{ margin: 0 }}>
      <div className="gd-revenue-main">
        <div className="gd-chart-y" aria-hidden="true">{ticks.map((t, i) => <span key={i}>{axisFormat(t)}</span>)}</div>
        <div className="gd-line-plot" onMouseLeave={() => setActive(null)}>
          <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden="true">
            <defs>
              <linearGradient id={fillId} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0" stopColor="var(--gd-coral)" stopOpacity=".3" />
                <stop offset="1" stopColor="var(--gd-coral)" stopOpacity=".02" />
              </linearGradient>
            </defs>
            {ticks.map((_, i) => <line className="gd-grid-line" key={i} x1="0" x2={w} y1={(h * i) / 4} y2={(h * i) / 4} />)}
            <g className="gd-line-reveal">
              <path className="gd-chart-path" data-tone="ink" data-dashed="true" d={curve(cPts)} />
              <path d={`${line} L ${w} ${h} H 0 Z`} fill={`url(#${fillId})`} />
              <path className="gd-chart-path" data-tone="coral" d={line} />
            </g>
            {pt && (
              <g>
                <line className="gd-line-cursor" x1={pt[0]} x2={pt[0]} y1="0" y2={h} />
                <circle cx={pt[0]} cy={pt[1]} r="4" fill="var(--gd-coral)" />
              </g>
            )}
          </svg>
          <div className="gd-chart-zones">
            {labels.map((label, i) => (
              <button type="button" key={label + i}
                aria-label={`${label}: ${primaryLabel} ${format(primary[i])}, ${comparisonLabel} ${format(comparison[i])}`}
                aria-pressed={active === i}
                onFocus={() => setActive(i)} onBlur={() => setActive(null)}
                onMouseEnter={() => setActive(i)} onClick={() => setActive(i)} />
            ))}
          </div>
          {active !== null && (
            <div className="gd-line-tooltip" style={{ "--gd-tooltip-x": `${(active / Math.max(1, labels.length - 1)) * 100}%` } as CSSProperties}>
              <strong>{labels[active]}</strong>
              <span>{primaryLabel} <b>{format(primary[active])}</b></span>
              <span>{comparisonLabel} <b>{format(comparison[active])}</b></span>
            </div>
          )}
        </div>
      </div>
      <div className="gd-chart-axis" aria-hidden="true">
        {labels.map((l, i) => (i % axisStep === 0 || i === labels.length - 1 ? <span key={i}>{l}</span> : null))}
      </div>
    </figure>
  );
}

function niceCeil(v: number) {
  const exp = Math.pow(10, Math.floor(Math.log10(v)));
  const f = v / exp;
  const nice = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10;
  return nice * exp;
}

const donutTones: ChartTone[] = ["coral", "ink", "teal", "ochre", "coral"];

export function DonutChart({ slices, total, totalLabel, format }: {
  slices: { label: string; value: number }[]; total: number; totalLabel: string; format: (v: number) => string;
}) {
  const maskId = `gd-ring-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const [active, setActive] = useState<number | null>(null);
  const sum = slices.reduce((a, s) => a + s.value, 0) || 1;
  const pct = slices.map((s) => (s.value / sum) * 100);
  return (
    <div className="gd-donut">
      <div className="gd-donut-ring">
        <svg viewBox="0 0 124 124" aria-hidden="true">
          <defs>
            <mask id={maskId}>
              <circle className="gd-donut-draw" cx="62" cy="62" r="47" fill="none" stroke="white" strokeWidth="15"
                pathLength="100" strokeDasharray="100 0" transform="rotate(-90 62 62)" />
            </mask>
          </defs>
          <circle cx="62" cy="62" r="47" fill="none" stroke="var(--gd-track)" strokeWidth="14" />
          <g mask={`url(#${maskId})`} transform="rotate(-90 62 62)">
            {pct.map((p, i) => (
              <circle key={slices[i].label} cx="62" cy="62" r="47" pathLength="100" fill="none" strokeWidth="14"
                data-tone={donutTones[i % donutTones.length]} className="gd-donut-segment"
                data-muted={active !== null && i !== active}
                strokeDasharray={`${Math.max(0, p - 1)} 100`}
                strokeDashoffset={-pct.slice(0, i).reduce((a, b) => a + b, 0)} />
            ))}
          </g>
        </svg>
        <div className="gd-donut-total">
          <strong>{active === null ? format(total) : format(slices[active].value)}</strong>
          <span>{active === null ? totalLabel : slices[active].label}</span>
        </div>
      </div>
      <div className="gd-donut-list">
        {slices.map((s, i) => (
          <button type="button" key={s.label} aria-pressed={active === i}
            aria-label={`${s.label}, ${format(s.value)}, ${Math.round(pct[i])}%`}
            onClick={() => setActive(active === i ? null : i)}>
            <span><i data-tone={donutTones[i % donutTones.length]} aria-hidden="true" />{s.label}</span>
            <span className="gd-mix-track" aria-hidden="true"><i className="gd-fill" data-tone={donutTones[i % donutTones.length]} style={{ width: `${pct[i]}%` }} /></span>
            <strong>{Math.round(pct[i])}%</strong>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------ dialog */

export function GlassDialog({ title, children, close }: { title: string; children: ReactNode; close: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const label = useId();
  useEffect(() => {
    const d = ref.current;
    d?.showModal();
    d?.querySelector<HTMLElement>("input, button:not([aria-label='Close dialog'])")?.focus();
  }, []);
  return (
    <dialog className="gd-dialog" ref={ref} aria-labelledby={label} onClose={close}
      onClick={(e) => { if (e.target === e.currentTarget) e.currentTarget.close(); }}>
      <section className="gd-dialog-inner">
        <header>
          <h2 id={label}>{title}</h2>
          <button type="button" className="gd-icon-button" aria-label="Close dialog" onClick={() => ref.current?.close()}><X aria-hidden="true" /></button>
        </header>
        {children}
      </section>
    </dialog>
  );
}

/* ------------------------------------------------------------- shell */

export type GlassView<T extends string = string> = {
  id: T; label: string; short: string; icon: LucideIcon; description: string; badge?: number;
};

function Dock<T extends string>({ views, active, side = false, select }: {
  views: GlassView<T>[]; active: T; side?: boolean; select: (v: T) => void;
}) {
  const nav = useRef<HTMLElement>(null);
  const marker = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const c = nav.current, ind = marker.current;
    if (!c || !ind) return;
    const adjust = () => {
      const cur = c.querySelector<HTMLElement>('[aria-current="page"]');
      if (!cur) return;
      ind.style.width = `${cur.offsetWidth}px`;
      ind.style.height = `${cur.offsetHeight}px`;
      ind.style.transform = `translate(${cur.offsetLeft}px, ${cur.offsetTop}px)`;
      ind.dataset.ready = "true";
    };
    const ro = new ResizeObserver(adjust);
    ro.observe(c);
    adjust();
    return () => ro.disconnect();
  }, [active]);
  const onClick = (e: MouseEvent<HTMLAnchorElement>, id: T) => {
    if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
    e.preventDefault();
    select(id);
  };
  return (
    <nav ref={nav} className={side ? "gd-dock gd-dock-side" : "gd-dock gd-dock-bottom"} aria-label={side ? "Dashboard sections" : "Dashboard sections (mobile)"}>
      <span ref={marker} className="gd-dock-indicator" aria-hidden="true" />
      {views.map(({ id, label, short, icon: Icon, badge }) => (
        <a href={`#${id}`} key={id} aria-label={badge ? `${label}, ${badge} pending` : label}
          aria-current={active === id ? "page" : undefined} onClick={(e) => onClick(e, id)}>
          <Icon aria-hidden="true" />
          <span className="gd-dock-text" aria-hidden="true">{label}</span>
          <span className="gd-dock-short" aria-hidden="true">{short}</span>
          {!!badge && <span className="gd-badge" aria-hidden="true">{badge > 99 ? "99+" : badge}</span>}
          {side && <span className="gd-dock-tip" aria-hidden="true">{label}</span>}
        </a>
      ))}
    </nav>
  );
}

function useReducedMotion() {
  const [reduced, setReduced] = useState(() =>
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  useEffect(() => {
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    const u = () => setReduced(m.matches);
    m.addEventListener("change", u);
    return () => m.removeEventListener("change", u);
  }, []);
  return reduced;
}

export function GlassShell<T extends string>({
  workspaceName, workspaceSubtitle, logo, views, active, onSelect, theme, onToggleTheme,
  headerActions, viewActions, onOpenSearch, animationKey, footerLeft, footerRight, children, panelFrost = 14,
}: {
  workspaceName: string; workspaceSubtitle?: string; logo: ReactNode;
  views: GlassView<T>[]; active: T; onSelect: (v: T) => void;
  theme: "light" | "dark"; onToggleTheme: () => void;
  headerActions?: ReactNode; viewActions?: ReactNode; onOpenSearch?: () => void;
  /** Changing this replays the entrance animation (e.g. view + period). */
  animationKey: string;
  footerLeft?: ReactNode; footerRight?: ReactNode; children: ReactNode; panelFrost?: number;
}) {
  const root = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const current = views.find((v) => v.id === active) ?? views[0];

  useEffect(() => {
    if (!onOpenSearch) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); onOpenSearch(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onOpenSearch]);

  useGSAP(() => {
    const layer = content.current;
    if (!layer) return;
    const counts = layer.querySelectorAll<HTMLElement>("[data-gd-count]");
    const writeFinal = () => counts.forEach((el) => {
      el.textContent = formatCount[el.dataset.format as CountFormat](Number(el.dataset.gdCount));
    });
    if (reduced) { writeFinal(); return; }
    const tl = gsap.timeline({ defaults: { ease: "power3.out" }, onComplete: writeFinal });
    tl.fromTo(layer, { opacity: 0.6, filter: "blur(4px)" }, { opacity: 1, filter: "blur(0px)", clearProps: "opacity,filter", duration: 0.3 }, 0);
    const enter = layer.querySelectorAll("[data-gd-enter]");
    if (enter.length) tl.from(enter, { y: 16, opacity: 0, stagger: 0.04, duration: 0.45, clearProps: "transform,opacity" }, 0.03);
    const bars = layer.querySelectorAll(".gd-stack-bar");
    if (bars.length) tl.from(bars, { scaleY: 0, stagger: 0.02, duration: 0.42, clearProps: "transform" }, 0.15);
    const line = layer.querySelector(".gd-line-reveal");
    if (line) tl.fromTo(line, { clipPath: "inset(0 100% 0 0)" }, { clipPath: "inset(0 0% 0 0)", duration: 0.7, clearProps: "clipPath" }, 0.12);
    const ring = layer.querySelector(".gd-donut-draw");
    if (ring) tl.fromTo(ring, { attr: { "stroke-dasharray": "0 100" } }, { attr: { "stroke-dasharray": "100 0" }, duration: 0.7 }, 0.15);
    counts.forEach((el, i) => {
      const value = Number(el.dataset.gdCount);
      const fmt = formatCount[el.dataset.format as CountFormat];
      const c = { v: 0 };
      tl.to(c, { v: value, duration: 0.7, onUpdate: () => { el.textContent = fmt(c.v); } }, 0.08 + i * 0.02);
    });
  }, { scope: content, dependencies: [animationKey, reduced], revertOnUpdate: true });

  return (
    <div className="gd-app" data-theme={theme} ref={root}
      style={{ "--gd-panel-frost": `${Math.max(0, Math.min(36, panelFrost))}px` } as CSSProperties}>
      <style>{glassyStyles}</style>
      <div className="gd-surround">
        <header className="gd-top">
          <div className="gd-brand">
            <span className="gd-logo" aria-hidden="true">{logo}</span>
            <div style={{ minWidth: 0 }}><strong>{workspaceName}</strong>{workspaceSubtitle && <small>{workspaceSubtitle}</small>}</div>
          </div>
          {onOpenSearch ? (
            <button type="button" className="gd-ask" onClick={onOpenSearch} aria-label="Search the dashboard">
              <Search aria-hidden="true" /><span>Jump to a section or snack…</span><kbd>⌘K</kbd>
            </button>
          ) : <span />}
          <div className="gd-top-actions">
            <button type="button" className="gd-icon-button" onClick={onToggleTheme}
              aria-label={theme === "light" ? "Switch to dark theme" : "Switch to light theme"}
              title={theme === "light" ? "Dark theme" : "Light theme"}>
              {theme === "light" ? <Moon aria-hidden="true" /> : <Sun aria-hidden="true" />}
            </button>
            {headerActions}
          </div>
        </header>

        <div className="gd-stage-wrap">
          <Dock views={views} active={active} side select={onSelect} />
          <main className="gd-stage" id="main">
            <div className="gd-stage-scroll">
              <header className="gd-view-head">
                <div>
                  <h1>{current.label}</h1>
                  <p>{current.description}</p>
                </div>
                {viewActions && <div className="gd-view-actions">{viewActions}</div>}
              </header>
              <div ref={content} key={active} data-view={active}>{children}</div>
            </div>
          </main>
        </div>
        <footer className="gd-footer">{footerLeft ?? <span />}{footerRight}</footer>
      </div>
      <Dock views={views} active={active} select={onSelect} />
    </div>
  );
}

/* ------------------------------------------------------------- CSV export */

/**
 * Builds a CSV safely. Cells that begin with = + - @ (or tab / CR) are
 * prefixed with an apostrophe so spreadsheet apps can't execute them as
 * formulas. This matters because snack request text comes from the public.
 */
export function saveCsv(filename: string, rows: (string | number)[][]) {
  const escape = (cell: string | number) => {
    let s = String(cell ?? "");
    if (typeof cell === "string" && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
    return `"${s.replace(/"/g, '""')}"`;
  };
  const csv = rows.map((r) => r.map(escape).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
