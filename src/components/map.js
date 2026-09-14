// Oblique Equal Earth — an interactive equal-area world map.
// Copyright (C) 2026 Georg Ogris
//
// This program is free software: you can redistribute it and/or modify it
// under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or (at your
// option) any later version. See the LICENSE file, or <https://www.gnu.org/licenses/>.

// Specific d3 modules rather than the whole of d3: the embeddable bundle
// would otherwise carry a few hundred kilobytes of unused scales and shapes.
import {geoEqualEarth, geoGraticule10, geoPath} from "npm:d3-geo";
import {drag} from "npm:d3-drag";
import {select} from "npm:d3-selection";
import {HitTester} from "./picker.js";
import {countryKey, lookupCountry} from "./registry.js";
import {THEMES, drawScene} from "./scene.js";
import {resolveTheme, watchTheme} from "./theme.js";
import {DEFAULT_SENSITIVITY, clampPitch, freeRotation, normalizeAngle, rollBy, slerpRotation, withRoll} from "./rotation.js";

/**
 * Build the interactive map element.
 *
 * Rendering is driven by two dirty flags rather than by drawing straight from
 * the event handlers. Mouse events fire faster than frames, so drawing inline
 * (as the original sketch did) can repaint the whole 50m world several times
 * per frame. Rotation dirties both buffers; a hover change dirties only the
 * visible one; a hover that stays within the same country dirties nothing.
 */
export function createMap({
  countries,
  marine = [],
  registry,
  width = 960,
  height = 500,
  scale = 170,
  sensitivity = DEFAULT_SENSITIVITY,
  initialRotation = [0, 0, 0],
  theme: themePreference = "auto",
  onThemeChange,
  onRotate,
  invalidation
} = {}) {
  const container = document.createElement("div");
  container.style.position = "relative";
  container.style.width = `${width}px`;
  container.style.maxWidth = "100%";

  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  const canvas = document.createElement("canvas");
  canvas.width = width * ratio;
  canvas.height = height * ratio;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  canvas.style.display = "block";
  canvas.style.borderRadius = "4px";
  canvas.style.touchAction = "none";
  const context = canvas.getContext("2d");
  context.scale(ratio, ratio);
  container.appendChild(canvas);

  // Offscreen index buffer, kept at CSS-pixel resolution so picks need no scaling.
  const hitCanvas = document.createElement("canvas");
  hitCanvas.width = width;
  hitCanvas.height = height;
  const hitContext = hitCanvas.getContext("2d", {willReadFrequently: true});

  const tooltip = document.createElement("div");
  tooltip.className = "map-tooltip";
  Object.assign(tooltip.style, {
    position: "absolute",
    background: "rgba(0, 0, 0, 0.85)",
    color: "#fff",
    padding: "6px 10px",
    borderRadius: "4px",
    fontFamily: "system-ui, sans-serif",
    fontSize: "12px",
    lineHeight: "1.4",
    pointerEvents: "none",
    whiteSpace: "nowrap",
    display: "none",
    zIndex: "10"
  });
  container.appendChild(tooltip);

  const projection = geoEqualEarth().scale(scale).translate([width / 2, height / 2]);
  const path = geoPath(projection, context);
  const hitPath = geoPath(projection, hitContext);
  const graticule = geoGraticule10();
  const sphere = {type: "Sphere"};


  // Everything pickable, in paint order. Countries are rendered into the hit
  // buffer after the marine areas, so land overwrites sea and wins the pick
  // wherever a coastline is ambiguous.
  const pickable = [...marine, ...countries];

  let theme = resolveTheme(themePreference);
  let rotation = [...initialRotation];
  let hovered = null;
  let sceneDirty = true;
  let hitDirty = true;
  let frame = null;

  function scene() {
    return {sphere, graticule, marine, countries, hovered, theme: THEMES[theme]};
  }

  function render() {
    frame = null;
    projection.rotate(rotation);
    if (hitDirty) {
      hitTester.render(pickable, (feature) => hitPath(feature));
      hitDirty = false;
    }
    if (sceneDirty) {
      drawScene(context, path, scene(), width, height);
      sceneDirty = false;
    }
  }

  function schedule() {
    if (frame === null) frame = requestAnimationFrame(render);
  }

  const hitTester = new HitTester(hitContext, width, height);
  let stopWatchingTheme = watchTheme(themePreference, applyTheme);

  function setRotation(next) {
    rotation = next;
    sceneDirty = hitDirty = true;
    schedule();
    // Every change is reported, including each frame of a transition, so
    // external controls can track the map rather than drift out of step with
    // it. A copy goes out: a listener must not be able to reach in and mutate
    // the rotation we are about to draw.
    onRotate?.([...rotation]);
  }

  function applyTheme(next) {
    if (next === theme) return;
    theme = next;
    sceneDirty = true;
    schedule();
    // The canvas repaints itself, but whatever chrome surrounds the map has to
    // be told so it can restyle too.
    onThemeChange?.(theme);
  }

  function setHovered(next) {
    if (next === hovered) return;
    hovered = next;
    sceneDirty = true;
    schedule();
  }

  // Quaternion drag. The grabbed sphere point and the rotation in force at
  // drag start are both captured, and every move is inverted through *that*
  // starting rotation — inverting through the live rotation would chase its
  // own tail. Holding the platform modifier switches the gesture to roll.
  let gesture = null;

  function invertAt(rotationAtStart, x, y) {
    projection.rotate(rotationAtStart);
    const spherical = projection.invert([x, y]);
    projection.rotate(rotation); // leave the shared projection as we found it
    return spherical;
  }

  select(canvas).call(
    drag()
      // d3-drag's default filter rejects ctrlKey to avoid macOS secondary
      // click, which would make Ctrl-drag (the Windows/Linux roll modifier)
      // dead on arrival. Only non-primary buttons are filtered here.
      .filter((event) => !event.button)
      .on("start", (event) => {
        stopTransition(); // the user takes over from any animation in flight
        const source = event.sourceEvent ?? {};
        const start = [...rotation];
        gesture = {
          start,
          rolling: Boolean(source.metaKey || source.ctrlKey),
          grabbed: invertAt(start, event.x, event.y)
        };
        canvas.style.cursor = gesture.rolling ? "ew-resize" : "grabbing";
      })
      .on("drag", (event) => {
        if (!gesture) return;
        if (gesture.rolling) {
          setRotation(rollBy(rotation, event.dx, sensitivity));
        } else {
          setRotation(freeRotation(gesture.start, gesture.grabbed, invertAt(gesture.start, event.x, event.y)));
        }
        setHovered(null);
        tooltip.style.display = "none";
      })
      .on("end", () => {
        gesture = null;
        canvas.style.cursor = "default";
      })
  );

  canvas.addEventListener("pointermove", (event) => {
    const bounds = canvas.getBoundingClientRect();
    const x = event.clientX - bounds.left;
    const y = event.clientY - bounds.top;
    const found = hitTester.pick(Math.round(x), Math.round(y));
    setHovered(found);

    if (found) {
      const meta = lookupCountry(registry, found);
      const label = meta ? meta.name : found.properties?.name ?? "Unknown";
      const kind = meta?.kind ? `<br/><span style="opacity:.7">${meta.kind}</span>` : "";
      tooltip.innerHTML = `<strong>${label}</strong>${kind}` +
        (meta?.wikiUrl ? "<br/>Click to read the Wikipedia article" : "");
      tooltip.style.display = "block";
      tooltip.style.left = `${Math.min(x + 14, width - tooltip.offsetWidth - 4)}px`;
      tooltip.style.top = `${Math.max(y - 8, 4)}px`;
      canvas.style.cursor = "pointer";
    } else {
      tooltip.style.display = "none";
      canvas.style.cursor = "default";
    }
  });

  canvas.addEventListener("pointerleave", () => {
    setHovered(null);
    tooltip.style.display = "none";
  });

  canvas.addEventListener("click", () => {
    const meta = hovered && lookupCountry(registry, hovered);
    if (meta?.wikiUrl) window.open(meta.wikiUrl, "_blank", "noopener");
  });

  /**
   * Release everything this map holds: pending frames, the running transition
   * and the system theme subscription. Embedders unmounting the map must be
   * able to stop it entirely, and a leaked matchMedia listener keeps the whole
   * closure — data included — alive.
   */
  container.destroy = () => {
    if (frame !== null) cancelAnimationFrame(frame);
    frame = null;
    stopTransition();
    stopWatchingTheme();
    stopWatchingTheme = () => {};
    container.remove();
  };

  // Framework re-runs cells on edit; without this the old rAF keeps painting.
  invalidation?.then(container.destroy);

  // --- Animated transitions between preset views -------------------------

  let transitionFrame = null;

  function stopTransition() {
    if (transitionFrame !== null) cancelAnimationFrame(transitionFrame);
    transitionFrame = null;
  }

  const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);

  /**
   * Swing to `target` over `duration` ms along the short great-circle arc in
   * orientation space. Roll is reported only once, at the end: notifying every
   * frame would have the slider write back mid-animation and fight it.
   */
  container.transitionTo = (target, duration = 750) => {
    stopTransition();
    const finish = () => {
      setRotation([...target]);
      transitionFrame = null;
    };

    if (duration <= 0) return finish();

    const from = [...rotation];
    const started = performance.now();
    const step = () => {
      const t = Math.min(1, (performance.now() - started) / duration);
      if (t >= 1) return finish();
      setRotation(slerpRotation(from, target, easeInOut(t)));
      transitionFrame = requestAnimationFrame(step);
    };
    transitionFrame = requestAnimationFrame(step);
  };

  /** Repaint in a different palette. Accepts "auto", "light" or "dark". */
  container.setTheme = (preference) => {
    stopWatchingTheme();
    stopWatchingTheme = watchTheme(preference, applyTheme);
    applyTheme(resolveTheme(preference));
  };

  /** The palette currently painted: "light" or "dark". */
  container.getTheme = () => theme;

  /** Current [yaw, pitch, roll]; a copy, so callers cannot mutate our state. */
  container.getRotation = () => [...rotation];

  container.setRoll = (roll) => {
    const next = withRoll(rotation, roll);
    if (next[2] === rotation[2]) return; // already there
    setRotation(next);
  };

  /**
   * Jump straight to an orientation. Pitch is clamped to the range versor's
   * Euler conversion can actually represent (+/-90), so a control cannot drive
   * the map somewhere it will immediately report differently.
   */
  container.setRotationTo = ([yaw, pitch, roll]) => {
    stopTransition();
    setRotation([normalizeAngle(yaw), clampPitch(pitch), normalizeAngle(roll)]);
  };
  schedule();
  return container;
}
