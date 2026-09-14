// @vitest-environment jsdom
// Oblique Equal Earth — an interactive equal-area world map.
// Copyright (C) 2026 Georg Ogris
//
// This program is free software: you can redistribute it and/or modify it
// under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or (at your
// option) any later version. See the LICENSE file, or <https://www.gnu.org/licenses/>.

import {afterEach, beforeEach, describe, expect, test, vi} from "vitest";
import {DEFAULT_ROTATION, STYLES, TAG, mount, register} from "../src/components/equal-earth-element.js";

const polygon = {type: "Polygon", coordinates: [[[8, 46], [9, 46], [9, 47], [8, 46]]]};
const DATA = {
  countries: {type: "FeatureCollection", features: [
    {type: "Feature", id: "040", properties: {name: "Austria", colour: 0}, geometry: polygon}
  ]},
  marine: {type: "FeatureCollection", features: [
    {type: "Feature", properties: {name: "Pacific Ocean", kind: "ocean"}, geometry: polygon}
  ]},
  registry: {"040": {name: "Austria", wikiUrl: "https://en.wikipedia.org/wiki/Austria"}}
};

function stubCanvas() {
  HTMLCanvasElement.prototype.getContext = () => ({
    fillStyle: null, strokeStyle: null, lineWidth: 1,
    scale: vi.fn(), clearRect: vi.fn(), beginPath: vi.fn(), closePath: vi.fn(),
    moveTo: vi.fn(), lineTo: vi.fn(), arc: vi.fn(), fill: vi.fn(), stroke: vi.fn(),
    getImageData: () => ({data: Uint8ClampedArray.from([0, 0, 0, 255])})
  });
}

beforeEach(() => {
  stubCanvas();
  // A synchronous rAF must still advance the clock, or the opening drift
  // recurses once per frame for its whole duration and blows the stack.
  // Individual tests that care about the animation install a real frame queue.
  let clock = 0;
  vi.stubGlobal("performance", {now: () => (clock += 500)});
  globalThis.requestAnimationFrame = (cb) => { cb(clock); return 1; };
  globalThis.cancelAnimationFrame = () => {};
  vi.stubGlobal("matchMedia", () => ({matches: false, addEventListener() {}, removeEventListener() {}}));
});

afterEach(() => vi.restoreAllMocks());

describe("mount", () => {
  const host = () => document.body.appendChild(document.createElement("div"));

  test("renders a map into the host it is given", async () => {
    const el = host();
    await mount(el, {data: DATA});
    expect(el.querySelector("canvas")).toBeTruthy();
  });

  test("renders the view picker alongside it", async () => {
    const el = host();
    await mount(el, {data: DATA});
    expect(el.querySelector(".view-picker")).toBeTruthy();
  });

  test("renders a roll control that does not depend on Observable Inputs", async () => {
    const el = host();
    await mount(el, {data: DATA});
    expect(el.querySelector('input[type="range"]')).toBeTruthy();
  });

  test("returns a controller exposing the theme", async () => {
    const controller = await mount(host(), {data: DATA, theme: "dark"});
    expect(controller.getTheme()).toBe("dark");
  });

  test("lets the embedder change theme after mounting", async () => {
    const controller = await mount(host(), {data: DATA, theme: "light"});
    controller.setTheme("dark");
    expect(controller.getTheme()).toBe("dark");
  });

  test("exposes the current rotation", async () => {
    const controller = await mount(host(), {data: DATA, rotation: [10, 20, 30]});
    expect(controller.getRotation()).toEqual([10, 20, 30]);
  });

  test("empties the host on destroy", async () => {
    const el = host();
    const controller = await mount(el, {data: DATA});
    controller.destroy();
    expect(el.querySelector("canvas")).toBeNull();
  });

  test("fetches the three datasets from the configured base", async () => {
    const asked = [];
    const loadJson = (url) => {
      asked.push(url);
      return Promise.resolve(url.includes("wiki") ? DATA.registry
        : url.includes("marine") ? DATA.marine : DATA.countries);
    };
    await mount(host(), {dataBase: "/assets/eq", loadJson});
    expect(asked).toEqual([
      "/assets/eq/countries.json", "/assets/eq/marine.json", "/assets/eq/wiki.json"
    ]);
  });

  test("tolerates a base given with a trailing slash", async () => {
    const asked = [];
    const loadJson = (url) => { asked.push(url); return Promise.resolve(DATA.countries); };
    await mount(host(), {dataBase: "/assets/eq/", loadJson});
    expect(asked[0]).toBe("/assets/eq/countries.json");
  });
});

describe("the custom element", () => {
  test("registers under the documented tag name", () => {
    register();
    expect(customElements.get(TAG)).toBeTruthy();
  });

  test("registering twice is harmless", () => {
    register();
    expect(() => register()).not.toThrow();
  });

  test("mounts into a shadow root, so host styles cannot reach in", async () => {
    register();
    const el = document.createElement(TAG);
    el.data = DATA;
    document.body.appendChild(el);
    await el.ready;
    expect(el.shadowRoot).toBeTruthy();
    expect(el.shadowRoot.querySelector("canvas")).toBeTruthy();
  });

  test("carries its own stylesheet inside the shadow root", async () => {
    register();
    const el = document.createElement(TAG);
    el.data = DATA;
    document.body.appendChild(el);
    await el.ready;
    expect(el.shadowRoot.querySelector("style").textContent).toContain(".view-picker");
  });

  test("honours the theme attribute", async () => {
    register();
    const el = document.createElement(TAG);
    el.data = DATA;
    el.setAttribute("theme", "dark");
    document.body.appendChild(el);
    await el.ready;
    expect(el.getTheme()).toBe("dark");
  });

  test("reacts to the theme attribute changing", async () => {
    register();
    const el = document.createElement(TAG);
    el.data = DATA;
    document.body.appendChild(el);
    await el.ready;
    el.setAttribute("theme", "dark");
    expect(el.getTheme()).toBe("dark");
  });

  test("reads the opening rotation from an attribute", async () => {
    register();
    const el = document.createElement(TAG);
    el.data = DATA;
    el.setAttribute("rotation", "0, 0, 180");
    document.body.appendChild(el);
    await el.ready;
    expect(el.getRotation()).toEqual([0, 0, 180]);
  });

  test("falls back to the documented default for a malformed rotation", async () => {
    register();
    const el = document.createElement(TAG);
    el.data = DATA;
    el.setAttribute("rotation", "banana");
    document.body.appendChild(el);
    await el.ready;
    expect(el.getRotation()).toEqual(DEFAULT_ROTATION);
  });

  test("tears itself down when removed from the document", async () => {
    register();
    const el = document.createElement(TAG);
    el.data = DATA;
    document.body.appendChild(el);
    await el.ready;
    el.remove();
    expect(el.shadowRoot.querySelector("canvas")).toBeNull();
  });
});

describe("lifecycle and live theming", () => {
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

  // The canvas repaints itself, but the surrounding chrome is styled by a
  // data-theme attribute that has to follow along.
  test("restyles its own chrome when the system flips to dark", async () => {
    const system = systemPrefersDark(false);
    const el = document.body.appendChild(document.createElement("div"));
    const controller = await mount(el, {data: DATA, theme: "auto"});
    expect(controller.element.dataset.theme).toBe("light");
    system.flip(true);
    expect(controller.element.dataset.theme).toBe("dark");
  });

  test("stops following the system after destroy", async () => {
    const system = systemPrefersDark(false);
    const el = document.body.appendChild(document.createElement("div"));
    const controller = await mount(el, {data: DATA, theme: "auto"});
    controller.destroy();
    system.flip(true);
    expect(controller.getTheme()).toBe("light");
  });

  test("removes its stylesheet from the host on destroy", async () => {
    const el = document.body.appendChild(document.createElement("div"));
    const controller = await mount(el, {data: DATA});
    controller.destroy();
    expect(el.querySelector("style")).toBeNull();
  });
});

describe("STYLES", () => {
  test("covers both palettes, so the shadow root needs no outside CSS", () => {
    expect(STYLES).toContain('[data-theme="dark"]');
    expect(STYLES).toContain('[data-theme="light"]');
  });

  test("does not leak bare element selectors into the host", () => {
    expect(STYLES).not.toMatch(/^\s*(body|html)\s*\{/m);
  });
});

describe("environments without a DOM", () => {
  test("reports that it could not register when there is no custom element registry", () => {
    const saved = globalThis.customElements;
    // eslint-disable-next-line no-global-assign
    vi.stubGlobal("customElements", undefined);
    expect(register("eq-no-dom")).toBe(false);
    vi.stubGlobal("customElements", saved);
  });

  test("reports success in a browser-like environment", () => {
    expect(register("eq-has-dom")).toBe(true);
  });

  // The registry refuses one constructor under two names, so each tag needs
  // its own class.
  test("can register under a second, custom tag name", () => {
    register();
    expect(register("eq-custom-tag")).toBe(true);
    expect(customElements.get("eq-custom-tag")).toBeTruthy();
  });
});

/** A real frame queue: a synchronous rAF lets a transition finish inside one call. */
function frameRunner(msPerFrame = 100) {
  let now = 0, nextId = 1;
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
    drain(max = 500) { let n = 0; while (queue.size && n++ < max) this.frame(); }
  };
}

const host = () => document.body.appendChild(document.createElement("div"));
const sliders = (el) => [...el.querySelectorAll('input[type="range"]')];
const slider = (el, axis) => el.querySelector(`input[type="range"][data-axis="${axis}"]`);

describe("all three degrees of freedom", () => {
  test("offers a slider per axis", () => {
    return mount(host(), {data: DATA}).then((c) => {
      expect(sliders(c.element).map((s) => s.dataset.axis)).toEqual(["yaw", "pitch", "roll"]);
    });
  });

  test("gives each slider the range its axis can actually take", async () => {
    const c = await mount(host(), {data: DATA});
    expect([slider(c.element, "yaw").min, slider(c.element, "yaw").max]).toEqual(["-180", "180"]);
    // versor's Euler conversion only ever reports pitch within +/-90.
    expect([slider(c.element, "pitch").min, slider(c.element, "pitch").max]).toEqual(["-90", "90"]);
    expect([slider(c.element, "roll").min, slider(c.element, "roll").max]).toEqual(["-180", "180"]);
  });

  test("starts each slider on the opening orientation", async () => {
    const c = await mount(host(), {data: DATA, rotation: [30, -20, 90], intro: false});
    expect(sliders(c.element).map((s) => Number(s.value))).toEqual([30, -20, 90]);
  });

  test("turns the map when a slider moves", async () => {
    const c = await mount(host(), {data: DATA, intro: false});
    const yaw = slider(c.element, "yaw");
    yaw.value = "60";
    yaw.dispatchEvent(new window.Event("input"));
    expect(c.getRotation()[0]).toBe(60);
  });

  test("drives pitch independently of yaw", async () => {
    const c = await mount(host(), {data: DATA, intro: false});
    const pitch = slider(c.element, "pitch");
    pitch.value = "-45";
    pitch.dispatchEvent(new window.Event("input"));
    expect(c.getRotation()[1]).toBe(-45);
  });

  test("follows the map when a preset view is chosen", async () => {
    const c = await mount(host(), {data: DATA, intro: false});
    c.transitionTo([90, -30, 45], 0);
    expect(sliders(c.element).map((s) => Number(s.value))).toEqual([90, -30, 45]);
  });

  test("every slider carries a visible label", async () => {
    const c = await mount(host(), {data: DATA});
    for (const axis of ["yaw", "pitch", "roll"]) {
      expect(slider(c.element, axis).getAttribute("aria-label"), axis).toBeTruthy();
    }
  });
});

describe("the info box", () => {
  test("is present", async () => {
    const c = await mount(host(), {data: DATA});
    expect(c.element.querySelector(".eq-info")).toBeTruthy();
  });

  test("is marked with an information glyph", async () => {
    const c = await mount(host(), {data: DATA});
    expect(c.element.querySelector(".eq-info").textContent).toContain("ℹ");
  });

  test("explains what the three axes do", async () => {
    const c = await mount(host(), {data: DATA});
    const text = c.element.querySelector(".eq-info").textContent.toLowerCase();
    for (const word of ["yaw", "pitch", "roll", "drag"]) expect(text, word).toContain(word);
  });
});

describe("the opening drift", () => {
  test("starts from the familiar north-up view", async () => {
    const frames = frameRunner();
    const c = await mount(host(), {data: DATA, rotation: [0, 0, 180], introDuration: 1000});
    expect(c.getRotation()).toEqual([0, 0, 0]);
  });

  test("arrives at the configured opening view", async () => {
    const frames = frameRunner();
    const c = await mount(host(), {data: DATA, rotation: [0, 0, 180], introDuration: 1000});
    frames.drain();
    expect(c.getRotation()).toEqual([0, 0, 180]);
  });

  test("passes through intermediate orientations rather than cutting", async () => {
    const frames = frameRunner(100);
    const c = await mount(host(), {data: DATA, rotation: [0, 0, 180], introDuration: 1000});
    frames.frame();
    frames.frame();
    const roll = c.getRotation()[2];
    expect(roll).not.toBe(0);
    expect(Math.abs(roll)).toBeLessThan(180);
  });

  // A large unrequested movement is exactly what this preference is for.
  test("does not drift at all when the reader asked for reduced motion", async () => {
    vi.stubGlobal("matchMedia", (q) => ({
      matches: q.includes("reduced-motion"), addEventListener() {}, removeEventListener() {}
    }));
    const c = await mount(host(), {data: DATA, rotation: [0, 0, 180], introDuration: 1000});
    expect(c.getRotation()).toEqual([0, 0, 180]);
  });

  test("can be switched off outright", async () => {
    const c = await mount(host(), {data: DATA, rotation: [0, 0, 180], intro: false});
    expect(c.getRotation()).toEqual([0, 0, 180]);
  });

  test("leaves the sliders showing the destination once it settles", async () => {
    const frames = frameRunner();
    const c = await mount(host(), {data: DATA, rotation: [0, 0, 180], introDuration: 1000});
    frames.drain();
    expect(Number(slider(c.element, "roll").value)).toBe(180);
  });
});

describe("intro as an element attribute", () => {
  test('intro="false" opens directly on the target', async () => {
    register();
    const el = document.createElement(TAG);
    el.data = DATA;
    el.setAttribute("rotation", "0, 0, 180");
    el.setAttribute("intro", "false");
    document.body.appendChild(el);
    await el.ready;
    expect(el.getRotation()).toEqual([0, 0, 180]);
  });
});

const readout = (el, axis) => el.querySelector(`.eq-axis[data-axis="${axis}"] .eq-value`);

describe("the axis controls", () => {
  test("puts each axis in its own row", async () => {
    const c = await mount(host(), {data: DATA, intro: false});
    const rows = [...c.element.querySelectorAll(".eq-axis")];
    expect(rows.map((r) => r.dataset.axis)).toEqual(["yaw", "pitch", "roll"]);
  });

  test("stacks the rows rather than placing them side by side", async () => {
    const c = await mount(host(), {data: DATA, intro: false});
    // Structural: the rows share one column container, and the stylesheet lays
    // that container out as a column. jsdom computes no layout of its own.
    expect(c.element.querySelector(".eq-axes")).toBeTruthy();
    expect(STYLES).toMatch(/\.eq-axes\s*\{[^}]*flex-direction:\s*column/);
  });

  test("shows the current value for every axis", async () => {
    const c = await mount(host(), {data: DATA, rotation: [30, -20, 90], intro: false});
    expect(["yaw", "pitch", "roll"].map((a) => readout(c.element, a).textContent))
      .toEqual(["30°", "−20°", "90°"]);
  });

  test("updates the readout when the map is turned", async () => {
    const c = await mount(host(), {data: DATA, intro: false});
    c.transitionTo([45, -10, 120], 0);
    expect(["yaw", "pitch", "roll"].map((a) => readout(c.element, a).textContent))
      .toEqual(["45°", "−10°", "120°"]);
  });

  test("updates the readout when its own slider moves", async () => {
    const c = await mount(host(), {data: DATA, intro: false});
    const yaw = slider(c.element, "yaw");
    yaw.value = "-75";
    yaw.dispatchEvent(new window.Event("input"));
    expect(readout(c.element, "yaw").textContent).toBe("−75°");
  });

  test("uses a real minus sign, not a hyphen, so the column does not jitter", async () => {
    const c = await mount(host(), {data: DATA, rotation: [-5, 0, 0], intro: false});
    expect(readout(c.element, "yaw").textContent.startsWith("−")).toBe(true);
  });

  test("shows zero without a sign", async () => {
    const c = await mount(host(), {data: DATA, rotation: [0, 0, 0], intro: false});
    expect(readout(c.element, "yaw").textContent).toBe("0°");
  });

  test("reserves a fixed width so the sliders do not shift as numbers change", () => {
    expect(STYLES).toMatch(/\.eq-value\s*\{[^}]*(min-width|width)/);
    expect(STYLES).toMatch(/\.eq-value\s*\{[^}]*tabular-nums/);
  });
});

describe("the default opening view", () => {
  test("is the documented oblique orientation", () => {
    expect(DEFAULT_ROTATION).toEqual([12, 12, 144]);
  });

  test("is genuinely oblique, not merely upside down", () => {
    // A pure roll leaves yaw and pitch at zero and keeps the normal aspect.
    const [yaw, pitch] = DEFAULT_ROTATION;
    expect(yaw === 0 && pitch === 0).toBe(false);
  });

  test("is where an unconfigured mount ends up", async () => {
    const c = await mount(host(), {data: DATA, intro: false});
    expect(c.getRotation()).toEqual(DEFAULT_ROTATION);
  });

  test("is where the opening turn lands", async () => {
    const frames = frameRunner();
    const c = await mount(host(), {data: DATA, introDuration: 1000});
    frames.drain();
    expect(c.getRotation()).toEqual(DEFAULT_ROTATION);
  });

  test("keeps pitch inside the range the sliders can show", () => {
    expect(Math.abs(DEFAULT_ROTATION[1])).toBeLessThanOrEqual(90);
  });
});
