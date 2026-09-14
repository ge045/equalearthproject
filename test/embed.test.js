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
  globalThis.requestAnimationFrame = (cb) => { cb(1); return 1; };
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
