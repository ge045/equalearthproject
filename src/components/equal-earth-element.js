// Oblique Equal Earth — an interactive equal-area world map.
// Copyright (C) 2026 Georg Ogris
//
// This program is free software: you can redistribute it and/or modify it
// under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or (at your
// option) any later version. See the LICENSE file, or <https://www.gnu.org/licenses/>.

/**
 * The embeddable entry point: <equal-earth-map>, plus a mount() for callers who
 * would rather drive it imperatively.
 *
 * This is also what the project's own page uses. Keeping one path means the
 * embedding story is exercised every time the site is opened, rather than being
 * a second, untested way to assemble the same parts.
 *
 * Everything ships inside a shadow root — markup, styles and all — because an
 * embed lands in a page whose CSS we have never seen and must not disturb.
 */
import {createMap} from "./map.js";
import {createViewPicker} from "./view-picker.js";
import {VIEW_GROUPS} from "./views.js";
import {resolveTheme} from "./theme.js";
import {prefersReducedMotion} from "./motion.js";
import {createInfoBadge} from "./info-badge.js";

export const TAG = "equal-earth-map";

/**
 * Where the opening turn ends: an oblique view centred near 10°W 6°S and
 * rolled 131°, which lands Africa in the middle and upside down.
 *
 * Deliberately oblique rather than merely inverted. A plain 180° roll is still
 * the *normal* aspect with the page turned over — the parallels stay straight
 * and the poles stay on the vertical axis. Bringing yaw and pitch in tilts the
 * projection's own frame away from the graticule, which is the thing this
 * project exists to show, and it is visible immediately in the curved grid.
 */
export const DEFAULT_ROTATION = [10, 6, 131];

/**
 * Where the opening drift starts: the north-up, Atlantic-centred view everyone
 * already recognises. Beginning there and turning to DEFAULT_ROTATION makes the
 * point of the project in one movement — it shows that the familiar view is one
 * orientation among many, rather than asserting it in prose.
 */
export const FAMILIAR_ROTATION = [0, 0, 0];

/** Milliseconds for that opening turn. */
export const DEFAULT_INTRO_DURATION = 4000;

const AXES = [
  {
    axis: "yaw", label: "Yaw", hint: "turn east–west", min: -180, max: 180,
    about: "Yaw spins the globe about its own axis, sliding the map east or west. "
      + "It chooses which meridian sits down the middle — the difference between an "
      + "atlas printed in London and one printed in Tokyo."
  },
  {
    // versor's Euler conversion only ever reports pitch within +/-90.
    axis: "pitch", label: "Pitch", hint: "tilt north–south", min: -90, max: 90,
    about: "Pitch tips the globe towards or away from you, moving the centre north "
      + "or south. This is what carries a pole into the middle of the map, which no "
      + "ordinary world map can show without tearing it apart."
  },
  {
    axis: "roll", label: "Roll", hint: "spin the view", min: -180, max: 180,
    about: "Roll turns the whole picture about the point facing you, so north stops "
      + "being up. At 180° the map is upside down; anywhere in between tilts the "
      + "grid of latitude and longitude away from the horizontal."
  }
];

const GENERAL_INFO =
  "Drag the map to turn it — whatever you grab stays under the cursor, and it "
  + "carries straight over the poles rather than stopping there. Hold ⌘ (Ctrl on "
  + "Windows and Linux) while dragging to spin it instead. Hover any country or "
  + "ocean to see its name, and click to read about it. The three sliders below "
  + "are the same movement, one axis at a time.";

export const STYLES = `
:host { display: block; container-type: inline-size; }
.eq-root {
  --eq-fg: #1b1b1b;
  --eq-muted: rgba(0, 0, 0, 0.62);
  --eq-rule: rgba(0, 0, 0, 0.14);
  --eq-chip: #f4f4f5;
  --eq-accent: #f39c12;
  color: var(--eq-fg);
  font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
  line-height: 1.5;
}
.eq-root[data-theme="light"] { --eq-fg: #1b1b1b; }
.eq-root[data-theme="dark"] {
  --eq-fg: #e6e9ec;
  --eq-muted: rgba(230, 233, 236, 0.66);
  --eq-rule: rgba(255, 255, 255, 0.16);
  --eq-chip: #1d2731;
  --eq-accent: #f5a623;
}
.eq-canvas-wrap { position: relative; }
.eq-controls {
  display: flex; align-items: flex-start; gap: 0.9rem;
  margin: 0.6rem 0 0.2rem; font-size: 13px; color: var(--eq-muted);
}
.eq-axes { display: flex; flex-direction: column; gap: 0.3rem; flex: 1 1 auto; max-width: 34rem; }
/* label, slider, value — one grid so the three rows line up as a column. */
.eq-axis { display: grid; grid-template-columns: 3.2rem auto 1fr auto; align-items: center; gap: 0.5rem; }
.eq-axis-name { color: var(--eq-fg); }
.eq-controls input[type="range"] { width: 100%; min-width: 4rem; accent-color: var(--eq-accent); }
.eq-value {
  min-width: 3.4rem; text-align: right;
  font-variant-numeric: tabular-nums; font-feature-settings: "tnum";
  color: var(--eq-fg);
}
.eq-header { display: flex; align-items: center; margin: 0 0 0.35rem; }

/* Circled information mark. The bubble is a real element rather than a title
   attribute: native tooltips are slow, unstyleable and never appear on focus. */
.eq-badge {
  position: relative; display: inline-flex; align-items: center; justify-content: center;
  width: 1.15rem; height: 1.15rem; flex: 0 0 auto;
  border: 1px solid var(--eq-rule); border-radius: 50%;
  background: var(--eq-chip); color: var(--eq-muted);
  font-size: 11px; line-height: 1; cursor: help; user-select: none;
}
.eq-badge:hover, .eq-badge:focus-visible { border-color: var(--eq-accent); color: var(--eq-accent); }
.eq-badge:focus-visible { outline: 2px solid var(--eq-accent); outline-offset: 2px; }
.eq-badge-mark { pointer-events: none; }
.eq-bubble {
  position: absolute; bottom: calc(100% + 0.4rem); z-index: 20;
  width: max-content; max-width: 30ch;
  padding: 0.5rem 0.7rem; border: 1px solid var(--eq-rule); border-radius: 4px;
  background: var(--eq-chip); color: var(--eq-fg);
  font-size: 12.5px; line-height: 1.45; text-align: left; font-weight: 400;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.18);
  opacity: 0; visibility: hidden; transition: opacity 120ms ease;
  pointer-events: none;
}
.eq-badge[data-align="left"] .eq-bubble { left: 0; }
.eq-badge[data-align="right"] .eq-bubble { left: 50%; transform: translateX(-50%); }
.eq-badge:hover .eq-bubble, .eq-badge:focus-visible .eq-bubble,
.eq-badge:focus .eq-bubble { opacity: 1; visibility: visible; }
@media (prefers-reduced-motion: reduce) { .eq-bubble { transition: none; } }
.eq-theme { display: flex; gap: 0.25rem; margin-left: auto; }
.eq-theme button, .view-row button {
  font: inherit; font-size: 12.5px; cursor: pointer; color: inherit;
  padding: 0.2rem 0.55rem; border-radius: 999px;
  border: 1px solid var(--eq-rule); background: var(--eq-chip);
}
.eq-theme button[aria-pressed="true"], .view-row button[aria-pressed="true"] {
  background: var(--eq-accent); border-color: var(--eq-accent); color: #1a1a1a; font-weight: 600;
}
.view-picker details { border-top: 1px solid var(--eq-rule); padding: 0.4rem 0; }
.view-picker summary { cursor: pointer; padding: 0.25rem 0; }
.view-count {
  font-size: 11px; opacity: 0.55; border: 1px solid currentColor;
  border-radius: 999px; padding: 0 0.4em; margin-left: 0.35em;
}
.view-blurb { margin: 0.2rem 0 0.6rem; font-size: 13px; color: var(--eq-muted); max-width: 62ch; }
.view-row { display: flex; flex-wrap: wrap; gap: 0.35rem; margin-bottom: 0.6rem; }
.view-row button:hover { border-color: var(--eq-accent); }
.view-note {
  font-size: 13.5px; margin: 0.1rem 0 0.7rem; max-width: 68ch;
  padding: 0.65rem 0.85rem; border-left: 3px solid var(--eq-accent);
  border-radius: 0 4px 4px 0; background: var(--eq-chip);
}
.view-note[hidden] { display: none; }
.view-note strong { display: block; font-size: 15px; margin-bottom: 0.3rem; }
.view-explanation { margin: 0 0 0.5rem; }
.view-note a { font-size: 12.5px; color: inherit; border-bottom: 1px solid currentColor; text-decoration: none; }
.view-note a:hover { color: var(--eq-accent); }
`;

const THEME_CHOICES = [["auto", "Auto"], ["light", "Light"], ["dark", "Dark"]];

const defaultLoadJson = async (url) => {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${response.status} ${response.statusText} for ${url}`);
  return response.json();
};

/** "12, 12, 144" -> [12, 12, 144]; anything unparseable -> null. */
export function parseRotation(text) {
  if (typeof text !== "string") return null;
  const parts = text.split(",").map((p) => Number(p.trim()));
  return parts.length === 3 && parts.every(Number.isFinite) ? parts : null;
}

/**
 * Build the map inside `host`.
 *
 * @param {Element|ShadowRoot} host
 * @param {object} [options]
 * @param {object} [options.data] pre-loaded {countries, marine, registry}
 * @param {string} [options.dataBase] where to fetch the three JSON files from
 * @param {"auto"|"light"|"dark"} [options.theme]
 * @param {[number,number,number]} [options.rotation]
 * @param {(url: string) => Promise<any>} [options.loadJson] injected for tests
 */
export async function mount(host, options = {}) {
  const {
    data,
    dataBase = "./data",
    theme = "auto",
    rotation = DEFAULT_ROTATION,
    width = 960,
    height = 500,
    loadJson = defaultLoadJson,
    showControls = true,
    intro = true,
    introFrom = FAMILIAR_ROTATION,
    introDuration = DEFAULT_INTRO_DURATION,
    invalidation
  } = options;

  // Open on the familiar view and turn to the real one — unless the reader has
  // asked for reduced motion, in which case start where we mean to end.
  const drift = intro && introDuration > 0 && !prefersReducedMotion();
  const openingRotation = drift ? introFrom : rotation;

  const base = String(dataBase).replace(/\/+$/, "");
  const loaded = data ?? {
    countries: await loadJson(`${base}/countries.json`),
    marine: await loadJson(`${base}/marine.json`),
    registry: await loadJson(`${base}/wiki.json`)
  };

  const root = document.createElement("div");
  root.className = "eq-root";
  root.dataset.theme = resolveTheme(theme);

  const inputs = new Map();
  const values = new Map();

  /** A real minus sign and tabular figures, so the column never jitters. */
  const formatAngle = (degrees) => `${Math.round(degrees) < 0 ? "\u2212" : ""}${Math.abs(Math.round(degrees))}\u00b0`;

  const header = document.createElement("div");
  header.className = "eq-header";
  // Left of, and above, the map: it explains the canvas, so it sits with it
  // rather than down among the controls.
  header.appendChild(createInfoBadge(GENERAL_INFO, {align: "left"}));
  root.appendChild(header);

  const map = createMap({
    countries: loaded.countries.features,
    marine: loaded.marine?.features ?? [],
    registry: loaded.registry ?? {},
    initialRotation: openingRotation,
    theme,
    invalidation,
    width,
    height,
    onRotate(next) {
      // Setting .value without dispatching: the map is the source of truth and
      // an event here would race the gesture that caused it.
      AXES.forEach(({axis}, i) => {
        const rounded = Math.round(next[i]);
        const input = inputs.get(axis);
        if (input && Number(input.value) !== rounded) input.value = String(rounded);
        const value = values.get(axis);
        if (value) value.textContent = formatAngle(rounded);
      });
    },
    onThemeChange(resolved) {
      root.dataset.theme = resolved;
    }
  });
  root.appendChild(map);

  const controls = document.createElement("div");
  controls.className = "eq-controls";

  // One slider per degree of freedom. Dragging can reach any orientation, but
  // only with a pointer; sliders make each axis reachable by keyboard and by
  // touch, and show the reader what the drag is actually doing.
  const axes = document.createElement("div");
  axes.className = "eq-axes";

  for (const {axis, label, hint, min, max, about} of AXES) {
    const index = AXES.findIndex((a) => a.axis === axis);
    const row = document.createElement("label");
    row.className = "eq-axis";
    row.dataset.axis = axis;

    const name = document.createElement("span");
    name.className = "eq-axis-name";
    name.textContent = label;
    row.appendChild(name);
    row.appendChild(createInfoBadge(about));

    const input = document.createElement("input");
    input.type = "range";
    input.dataset.axis = axis;
    input.min = String(min);
    input.max = String(max);
    input.step = "1";
    input.value = String(Math.round(rotation[index] ?? 0));
    input.setAttribute("aria-label", `${label} — ${hint}`);
    input.title = `${label} — ${hint}`;
    input.addEventListener("input", () => {
      map.setRotationTo(AXES.map(({axis: a}) => Number(inputs.get(a).value)));
    });
    inputs.set(axis, input);
    row.appendChild(input);

    const value = document.createElement("span");
    value.className = "eq-value";
    value.textContent = formatAngle(rotation[index] ?? 0);
    values.set(axis, value);
    row.appendChild(value);

    axes.appendChild(row);
  }
  controls.appendChild(axes);

  const themeButtons = document.createElement("div");
  themeButtons.className = "eq-theme";
  const paint = (preference) => {
    for (const button of themeButtons.children) {
      button.setAttribute("aria-pressed", String(button.dataset.theme === preference));
    }
  };
  for (const [value, text] of THEME_CHOICES) {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.theme = value;
    button.textContent = text;
    button.addEventListener("click", () => {
      map.setTheme(value);
      root.dataset.theme = map.getTheme();
      paint(value);
    });
    themeButtons.appendChild(button);
  }
  paint(theme);
  controls.appendChild(themeButtons);
  if (showControls) root.appendChild(controls);

  const picker = createViewPicker({
    groups: VIEW_GROUPS,
    onSelect: (chosen) => map.transitionTo(chosen.rotation)
  });
  map.addEventListener("pointerdown", () => picker.clearSelection());
  if (showControls) root.appendChild(picker);

  if (drift) map.transitionTo([...rotation], introDuration);

  const style = document.createElement("style");
  style.textContent = STYLES;
  host.appendChild(style);
  host.appendChild(root);

  return {
    element: root,
    map,
    picker,
    getTheme: () => map.getTheme(),
    setTheme(preference) {
      map.setTheme(preference);
      root.dataset.theme = map.getTheme();
      paint(preference);
    },
    getRotation: () => map.getRotation(),
    transitionTo: (target, duration) => map.transitionTo(target, duration),
    destroy() {
      map.destroy?.();
      style.remove();
      root.remove();
    }
  };
}

/**
 * The element class is built on demand rather than at module scope.
 *
 * `class X extends HTMLElement` is evaluated when the module loads, so defining
 * it eagerly makes this module unimportable anywhere without a DOM — Node, the
 * snapshot script, any server-side render, and the link check that verifies
 * every module resolves.
 */
function defineElementClass() {
  // A fresh class per tag: the custom element registry refuses to register one
  // constructor under two names, so caching a single class would make any
  // second, custom tag name fail.
  return class EqualEarthMap extends HTMLElement {
    static observedAttributes = ["theme", "rotation"];
    #controller = null;

    connectedCallback() {
      if (!this.shadowRoot) this.attachShadow({mode: "open"});
      this.ready = mount(this.shadowRoot, {
        data: this.data,
        dataBase: this.getAttribute("data-base") ?? undefined,
        theme: this.getAttribute("theme") ?? "auto",
        rotation: parseRotation(this.getAttribute("rotation")) ?? DEFAULT_ROTATION,
        width: Number(this.getAttribute("width")) || undefined,
        height: Number(this.getAttribute("height")) || undefined,
        intro: this.getAttribute("intro") !== "false"
      }).then((controller) => {
        this.#controller = controller;
        return controller;
      });
      return this.ready;
    }

    disconnectedCallback() {
      this.#controller?.destroy();
      this.#controller = null;
    }

    attributeChangedCallback(name, previous, value) {
      if (previous === value || !this.#controller) return;
      if (name === "theme") this.#controller.setTheme(value ?? "auto");
      if (name === "rotation") {
        const parsed = parseRotation(value);
        if (parsed) this.#controller.transitionTo(parsed);
      }
    }

    getTheme() { return this.#controller?.getTheme(); }
    getRotation() { return this.#controller?.getRotation(); }
    setTheme(preference) { this.#controller?.setTheme(preference); }
  };
}

/**
 * Define the custom element. Safe to call more than once, and a no-op without a
 * DOM so importing this module never depends on the environment.
 * @returns true if the element is registered
 */
export function register(tag = TAG) {
  if (typeof HTMLElement === "undefined" || typeof customElements === "undefined") return false;
  if (!customElements.get(tag)) customElements.define(tag, defineElementClass());
  return true;
}
