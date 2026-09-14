// @vitest-environment jsdom
// Oblique Equal Earth — an interactive equal-area world map.
// Copyright (C) 2026 Georg Ogris
//
// This program is free software: you can redistribute it and/or modify it
// under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or (at your
// option) any later version. See the LICENSE file, or <https://www.gnu.org/licenses/>.

import {afterEach, beforeEach, describe, expect, test, vi} from "vitest";
import {createMap} from "../src/components/map.js";

/** A 2D context stub good enough for d3.geoPath and the picker. */
function stubContext(pickIndex) {
  return {
    fillStyle: null, strokeStyle: null, lineWidth: 1,
    scale: vi.fn(), clearRect: vi.fn(), beginPath: vi.fn(), closePath: vi.fn(),
    moveTo: vi.fn(), lineTo: vi.fn(), arc: vi.fn(), fill: vi.fn(), stroke: vi.fn(),
    save: vi.fn(), restore: vi.fn(), translate: vi.fn(),
    getImageData: () => ({
      data: Uint8ClampedArray.from([0, 0, pickIndex === null ? 0 : pickIndex + 1, 255])
    })
  };
}

const country = (id, name) => ({
  type: "Feature", id, properties: {name},
  geometry: {type: "Polygon", coordinates: [[[8, 46], [9, 46], [9, 47], [8, 47], [8, 46]]]}
});

function mount({pickIndex = null} = {}) {
  // Only the hit canvas asks for willReadFrequently — use that to target it.
  HTMLCanvasElement.prototype.getContext = function (type, options) {
    return options?.willReadFrequently ? stubContext(pickIndex) : stubContext(null);
  };
  return createMap({
    countries: [country("040", "Austria"), country("250", "France")],
    contourBands: [],
    glaciers: {type: "FeatureCollection", features: []},
    registry: {"040": {name: "Austria", wikiUrl: "https://en.wikipedia.org/wiki/Austria"}},
    width: 960,
    height: 500
  });
}

let originalRaf;

beforeEach(() => {
  originalRaf = globalThis.requestAnimationFrame;
  // Render synchronously so assertions do not race the frame loop.
  globalThis.requestAnimationFrame = (cb) => { cb(); return 1; };
  globalThis.cancelAnimationFrame = vi.fn();
});

afterEach(() => {
  globalThis.requestAnimationFrame = originalRaf;
  vi.restoreAllMocks();
});

describe("createMap", () => {
  test("returns a container holding exactly one visible canvas", () => {
    expect(mount().querySelectorAll("canvas")).toHaveLength(1);
  });

  test("sizes the visible canvas to the requested dimensions", () => {
    const canvas = mount().querySelector("canvas");
    expect([canvas.style.width, canvas.style.height]).toEqual(["960px", "500px"]);
  });

  test("starts with the tooltip hidden", () => {
    const tooltip = mount().querySelector(".map-tooltip");
    expect(tooltip.style.display).toBe("none");
  });

  test("shows the registry name when the cursor is over a country", () => {
    const map = mount({pickIndex: 0});
    map.querySelector("canvas").dispatchEvent(
      new window.MouseEvent("pointermove", {clientX: 400, clientY: 250, bubbles: true})
    );
    const tooltip = map.querySelector(".map-tooltip");
    expect(tooltip.style.display).toBe("block");
    expect(tooltip.innerHTML).toContain("Austria");
  });

  test("hides the tooltip over open ocean", () => {
    const map = mount({pickIndex: null});
    map.querySelector("canvas").dispatchEvent(
      new window.MouseEvent("pointermove", {clientX: 5, clientY: 5, bubbles: true})
    );
    expect(map.querySelector(".map-tooltip").style.display).toBe("none");
  });

  test("falls back to the feature's own name when the registry has no entry", () => {
    const map = mount({pickIndex: 1}); // France, absent from the stub registry
    map.querySelector("canvas").dispatchEvent(
      new window.MouseEvent("pointermove", {clientX: 400, clientY: 250, bubbles: true})
    );
    expect(map.querySelector(".map-tooltip").innerHTML).toContain("France");
  });

  test("hides the tooltip when the pointer leaves the map", () => {
    const map = mount({pickIndex: 0});
    const canvas = map.querySelector("canvas");
    canvas.dispatchEvent(new window.MouseEvent("pointermove", {clientX: 400, clientY: 250, bubbles: true}));
    canvas.dispatchEvent(new window.MouseEvent("pointerleave", {bubbles: true}));
    expect(map.querySelector(".map-tooltip").style.display).toBe("none");
  });

  test("opens Wikipedia for the hovered country on click", () => {
    const open = vi.fn();
    vi.stubGlobal("open", open);
    const map = mount({pickIndex: 0});
    const canvas = map.querySelector("canvas");
    canvas.dispatchEvent(new window.MouseEvent("pointermove", {clientX: 400, clientY: 250, bubbles: true}));
    canvas.dispatchEvent(new window.MouseEvent("click", {bubbles: true}));
    expect(open).toHaveBeenCalledWith("https://en.wikipedia.org/wiki/Austria", "_blank", "noopener");
  });

  test("does not open anything when clicking open ocean", () => {
    const open = vi.fn();
    vi.stubGlobal("open", open);
    const map = mount({pickIndex: null});
    map.querySelector("canvas").dispatchEvent(new window.MouseEvent("click", {bubbles: true}));
    expect(open).not.toHaveBeenCalled();
  });

  test("exposes setRoll for the slider to drive", () => {
    expect(typeof mount().setRoll).toBe("function");
  });

  test("cancels its pending frame when the cell is invalidated", async () => {
    let invalidate;
    const invalidation = new Promise((resolve) => { invalidate = resolve; });
    HTMLCanvasElement.prototype.getContext = (type, options) =>
      options?.willReadFrequently ? stubContext(null) : stubContext(null);
    // Queue a frame without running it, so there is something to cancel.
    globalThis.requestAnimationFrame = () => 42;
    createMap({
      countries: [], contourBands: [],
      glaciers: {type: "FeatureCollection", features: []},
      registry: {}, invalidation
    });
    invalidate();
    await invalidation;
    expect(globalThis.cancelAnimationFrame).toHaveBeenCalledWith(42);
  });
});

/**
 * Drive a d3-drag gesture through jsdom mouse events.
 *
 * d3-drag reads `event.view`, but jsdom's MouseEvent constructor rejects the
 * global window as a Window instance under vitest, so it is patched on after
 * construction.
 */
function dragCanvas(canvas, from, to, {meta = false} = {}) {
  const mk = (type, [x, y], extra = {}) => {
    const ev = new window.MouseEvent(type, {clientX: x, clientY: y, bubbles: true, metaKey: meta, ...extra});
    Object.defineProperty(ev, "view", {value: window, configurable: true});
    return ev;
  };
  canvas.dispatchEvent(mk("mousedown", from, {button: 0}));
  window.dispatchEvent(mk("mousemove", to));
  window.dispatchEvent(mk("mouseup", to));
}

describe("rotation gestures", () => {
  function mountWithRoll(rolls) {
    HTMLCanvasElement.prototype.getContext = (type, options) =>
      options?.willReadFrequently ? stubContext(null) : stubContext(null);
    return createMap({
      countries: [country("040", "Austria")],
      contourBands: [],
      glaciers: {type: "FeatureCollection", features: []},
      registry: {},
      width: 960, height: 500,
      onRotate: (r) => rolls.push(r[2])
    });
  }

  test("meta-drag to the right spins the map", () => {
    const rolls = [];
    const map = mountWithRoll(rolls);
    dragCanvas(map.querySelector("canvas"), [400, 250], [500, 250], {meta: true});
    expect(rolls.at(-1)).toBeGreaterThan(0);
  });

  test("meta-drag to the left spins it the other way", () => {
    const rolls = [];
    const map = mountWithRoll(rolls);
    dragCanvas(map.querySelector("canvas"), [500, 250], [400, 250], {meta: true});
    expect(rolls.at(-1)).toBeLessThan(0);
  });

  test("meta-drag reports roll so the slider can follow", () => {
    const rolls = [];
    const map = mountWithRoll(rolls);
    dragCanvas(map.querySelector("canvas"), [400, 250], [460, 250], {meta: true});
    expect(rolls.length).toBeGreaterThan(0);
    expect(Number.isFinite(rolls.at(-1))).toBe(true);
  });

  test("a plain drag does not spin the map about the viewing axis", () => {
    const rolls = [];
    const map = mountWithRoll(rolls);
    dragCanvas(map.querySelector("canvas"), [480, 250], [480, 300]);
    // A straight vertical drag through the centre is pure pitch: no roll.
    expect(rolls.at(-1) ?? 0).toBeCloseTo(0, 6);
  });

  test("hides the tooltip while dragging", () => {
    const rolls = [];
    const map = mountWithRoll(rolls);
    const canvas = map.querySelector("canvas");
    canvas.dispatchEvent(new window.MouseEvent("pointermove", {clientX: 400, clientY: 250, bubbles: true}));
    dragCanvas(canvas, [400, 250], [500, 300]);
    expect(map.querySelector(".map-tooltip").style.display).toBe("none");
  });
});

describe("initial orientation", () => {
  function mountWith(options) {
    HTMLCanvasElement.prototype.getContext = (type, opts) =>
      opts?.willReadFrequently ? stubContext(null) : stubContext(null);
    return createMap({
      countries: [country("040", "Austria")],
      contourBands: [],
      glaciers: {type: "FeatureCollection", features: []},
      registry: {}, width: 960, height: 500,
      ...options
    });
  }

  test("starts unrotated by default", () => {
    expect(mountWith({}).getRotation()).toEqual([0, 0, 0]);
  });

  test("starts at the supplied rotation", () => {
    expect(mountWith({initialRotation: [180, 0, 180]}).getRotation()).toEqual([180, 0, 180]);
  });

  test("does not hand out its internal rotation array to mutate", () => {
    const map = mountWith({initialRotation: [180, 0, 180]});
    map.getRotation()[0] = 999;
    expect(map.getRotation()[0]).toBe(180);
  });

  test("does not announce a roll change merely for starting rolled", () => {
    const rolls = [];
    mountWith({initialRotation: [180, 0, 180], onRotate: (r) => rolls.push(r[2])});
    expect(rolls).toEqual([]);
  });

  test("a slider set to the starting roll is a no-op", () => {
    const rolls = [];
    const map = mountWith({initialRotation: [180, 0, 180], onRotate: (r) => rolls.push(r[2])});
    map.setRoll(180);
    expect(map.getRotation()).toEqual([180, 0, 180]);
  });

  test("the slider can still roll away from the starting orientation", () => {
    const map = mountWith({initialRotation: [180, 0, 180]});
    map.setRoll(90);
    expect(map.getRotation()[2]).toBe(90);
  });
});

describe("transitionTo", () => {
  function mountPlain(extra = {}) {
    HTMLCanvasElement.prototype.getContext = (type, opts) =>
      opts?.willReadFrequently ? stubContext(null) : stubContext(null);
    return createMap({
      countries: [country("040", "Austria")], marine: [],
      registry: {}, width: 960, height: 500, ...extra
    });
  }

  /**
   * A real frame queue. Callbacks must NOT run synchronously: a synchronous rAF
   * lets a transition recurse to completion inside one call, so every duration
   * looks instantaneous and the tests prove nothing.
   */
  function frameRunner(msPerFrame = 50) {
    let now = 0;
    let nextId = 1;
    const queue = new Map();
    vi.stubGlobal("performance", {now: () => now});
    globalThis.requestAnimationFrame = (cb) => { queue.set(nextId, cb); return nextId++; };
    globalThis.cancelAnimationFrame = (id) => queue.delete(id);
    return {
      frame() {
        now += msPerFrame;
        const batch = [...queue.values()];
        queue.clear();
        for (const cb of batch) cb(now);
      },
      drain(maxFrames = 500) {
        let n = 0;
        while (queue.size && n++ < maxFrames) this.frame();
      },
      get pending() { return queue.size; }
    };
  }

  test("snaps straight to the target when given no duration", () => {
    const map = mountPlain();
    map.transitionTo([90, -30, 0], 0);
    expect(map.getRotation()).toEqual([90, -30, 0]);
  });

  test("settles exactly on the target after animating", () => {
    const frames = frameRunner();
    const map = mountPlain();
    map.transitionTo([90, -30, 0], 500);
    frames.drain();
    expect(map.getRotation()).toEqual([90, -30, 0]);
  });

  test("does not arrive on the very first frame", () => {
    const frames = frameRunner(50);
    const map = mountPlain();
    map.transitionTo([120, 0, 0], 1000);
    frames.frame();
    expect(map.getRotation()).not.toEqual([120, 0, 0]);
  });

  test("passes through orientations between start and target", () => {
    const frames = frameRunner(50);
    const map = mountPlain();
    map.transitionTo([120, 0, 0], 1000);
    frames.frame();
    frames.frame();
    const [yaw] = map.getRotation();
    expect(yaw).toBeGreaterThan(0);
    expect(yaw).toBeLessThan(120);
  });

  test("stops requesting frames once it arrives", () => {
    const frames = frameRunner();
    const map = mountPlain();
    map.transitionTo([90, -30, 0], 200);
    frames.drain();
    expect(frames.pending).toBe(0);
  });

  test("reports every frame of a transition so controls can follow it", () => {
    const frames = frameRunner(50);
    const seen = [];
    const map = mountPlain({onRotate: (r) => seen.push([...r])});
    map.transitionTo([0, 0, 90], 500);
    frames.drain();
    expect(seen.length).toBeGreaterThan(2);
  });

  test("lands its last report exactly on the target", () => {
    const frames = frameRunner();
    const seen = [];
    const map = mountPlain({onRotate: (r) => seen.push([...r])});
    map.transitionTo([90, -30, 0], 500);
    frames.drain();
    expect(seen.at(-1)).toEqual([90, -30, 0]);
  });

  test("a new transition supersedes one already running", () => {
    const frames = frameRunner(10);
    const map = mountPlain();
    map.transitionTo([120, 0, 0], 10000);
    frames.frame();
    map.transitionTo([0, 45, 0], 0);
    frames.drain();
    expect(map.getRotation()).toEqual([0, 45, 0]);
  });

  test("grabbing the map cancels a running transition", () => {
    const frames = frameRunner(10);
    const map = mountPlain();
    map.transitionTo([120, 0, 0], 10000);
    frames.frame();
    frames.frame();
    dragCanvas(map.querySelector("canvas"), [480, 250], [480, 250]);
    frames.drain();
    expect(map.getRotation()).not.toEqual([120, 0, 0]);
  });
});

describe("theming", () => {
  function mountThemed(extra = {}) {
    HTMLCanvasElement.prototype.getContext = (type, opts) =>
      opts?.willReadFrequently ? stubContext(null) : stubContext(null);
    return createMap({
      countries: [country("040", "Austria")], marine: [],
      registry: {}, width: 960, height: 500, ...extra
    });
  }

  /** matchMedia stand-in we can flip at will. */
  function systemPrefersDark(dark) {
    const listeners = new Set();
    const query = {
      matches: dark,
      addEventListener: (_, fn) => listeners.add(fn),
      removeEventListener: (_, fn) => listeners.delete(fn)
    };
    vi.stubGlobal("matchMedia", () => query);
    return {flip: (d) => { query.matches = d; for (const l of [...listeners]) l({matches: d}); }};
  }

  test("defaults to light when the system has no dark preference", () => {
    systemPrefersDark(false);
    expect(mountThemed().getTheme()).toBe("light");
  });

  test("starts dark when the system prefers dark", () => {
    systemPrefersDark(true);
    expect(mountThemed().getTheme()).toBe("dark");
  });

  test("honours a pinned theme regardless of the system", () => {
    systemPrefersDark(true);
    expect(mountThemed({theme: "light"}).getTheme()).toBe("light");
  });

  test("follows the system flipping to dark while open", () => {
    const system = systemPrefersDark(false);
    const map = mountThemed();
    system.flip(true);
    expect(map.getTheme()).toBe("dark");
  });

  test("ignores the system flipping when pinned", () => {
    const system = systemPrefersDark(false);
    const map = mountThemed({theme: "light"});
    system.flip(true);
    expect(map.getTheme()).toBe("light");
  });

  test("switches palette on demand", () => {
    systemPrefersDark(false);
    const map = mountThemed();
    map.setTheme("dark");
    expect(map.getTheme()).toBe("dark");
  });

  test("can be handed back to the system after being pinned", () => {
    const system = systemPrefersDark(false);
    const map = mountThemed({theme: "dark"});
    map.setTheme("auto");
    expect(map.getTheme()).toBe("light");
    system.flip(true);
    expect(map.getTheme()).toBe("dark");
  });

  test("stops following the system once the cell is invalidated", async () => {
    const system = systemPrefersDark(false);
    let invalidate;
    const invalidation = new Promise((r) => { invalidate = r; });
    const map = mountThemed({invalidation});
    invalidate();
    await invalidation;
    system.flip(true);
    expect(map.getTheme()).toBe("light");
  });
});

describe("reporting rotation to external controls", () => {
  function mountReporting(seen) {
    HTMLCanvasElement.prototype.getContext = (type, opts) =>
      opts?.willReadFrequently ? stubContext(null) : stubContext(null);
    return createMap({
      countries: [country("040", "Austria")], marine: [],
      registry: {}, width: 960, height: 500,
      onRotate: (r) => seen.push([...r])
    });
  }

  test("reports a drag as it happens", () => {
    const seen = [];
    const map = mountReporting(seen);
    dragCanvas(map.querySelector("canvas"), [400, 250], [500, 280]);
    expect(seen.length).toBeGreaterThan(0);
  });

  test("reports a roll gesture", () => {
    const seen = [];
    const map = mountReporting(seen);
    dragCanvas(map.querySelector("canvas"), [400, 250], [500, 250], {meta: true});
    expect(seen.at(-1)[2]).not.toBe(0);
  });

  test("reports a slider-driven roll", () => {
    const seen = [];
    const map = mountReporting(seen);
    map.setRoll(45);
    expect(seen.at(-1)).toEqual([0, 0, 45]);
  });

  test("hands out a copy, so a listener cannot mutate the map's state", () => {
    const seen = [];
    const map = mountReporting(seen);
    map.setRoll(45);
    seen.at(-1)[0] = 999;
    expect(map.getRotation()[0]).toBe(0);
  });

  test("setRotationTo moves the map and reports it", () => {
    const seen = [];
    const map = mountReporting(seen);
    map.setRotationTo([30, -20, 10]);
    expect(map.getRotation()).toEqual([30, -20, 10]);
    expect(seen.at(-1)).toEqual([30, -20, 10]);
  });

  test("setRotationTo clamps pitch into the range versor can represent", () => {
    const seen = [];
    const map = mountReporting(seen);
    map.setRotationTo([0, 140, 0]);
    expect(Math.abs(map.getRotation()[1])).toBeLessThanOrEqual(90);
  });
});
