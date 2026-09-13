// Oblique Equal Earth — an interactive equal-area world map.
// Copyright (C) 2026 Georg Ogris
//
// This program is free software: you can redistribute it and/or modify it
// under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or (at your
// option) any later version. See the LICENSE file, or <https://www.gnu.org/licenses/>.

import {describe, expect, test} from "vitest";
import {THEMES, drawScene, paletteColour} from "../src/components/scene.js";

/** Records drawing calls, capturing the style in force at the moment of each. */
function recordingContext() {
  const calls = [];
  return {
    calls,
    fillStyle: null, strokeStyle: null, lineWidth: 1,
    clearRect: (...a) => calls.push({op: "clearRect", args: a}),
    beginPath() { calls.push({op: "beginPath"}); },
    fill() { calls.push({op: "fill", style: this.fillStyle}); },
    stroke() { calls.push({op: "stroke", style: this.strokeStyle}); }
  };
}

const feature = (id) => ({type: "Feature", id, properties: {}, geometry: null});
const sea = (name) => ({type: "Feature", properties: {name}, geometry: null});

function scene(overrides = {}) {
  return {
    sphere: {type: "Sphere"},
    graticule: {type: "MultiLineString", coordinates: []},
    marine: [sea("Pacific Ocean"), sea("Coral Sea")],
    countries: [feature("040"), feature("250")],
    hovered: null,
    theme: THEMES.light,
    ...overrides
  };
}

const fills = (ctx) => ctx.calls.filter((c) => c.op === "fill").map((c) => c.style);

describe("drawScene", () => {
  test("clears the canvas before drawing anything", () => {
    const ctx = recordingContext();
    drawScene(ctx, () => {}, scene(), 960, 500);
    expect(ctx.calls[0]).toEqual({op: "clearRect", args: [0, 0, 960, 500]});
  });

  test("lays the ocean down first", () => {
    const ctx = recordingContext();
    drawScene(ctx, () => {}, scene(), 960, 500);
    expect(fills(ctx)[0]).toBe(THEMES.light.ocean);
  });

  test("draws marine areas beneath the countries", () => {
    const ctx = recordingContext();
    drawScene(ctx, () => {}, scene(), 960, 500);
    const order = fills(ctx);
    expect(order.lastIndexOf(THEMES.light.marine)).toBeLessThan(order.indexOf(THEMES.light.land[0]));
  });

  test("tints every named marine area so the ocean is not a flat slab", () => {
    const ctx = recordingContext();
    drawScene(ctx, () => {}, scene(), 960, 500);
    expect(fills(ctx).filter((s) => s === THEMES.light.marine)).toHaveLength(2);
  });

  test("fills the hovered country with the highlight colour", () => {
    const ctx = recordingContext();
    const base = scene();
    drawScene(ctx, () => {}, {...base, hovered: base.countries[1]}, 960, 500);
    expect(fills(ctx)).toContain(THEMES.light.highlight);
  });

  test("fills a hovered marine area with its own highlight colour", () => {
    const ctx = recordingContext();
    const base = scene();
    drawScene(ctx, () => {}, {...base, hovered: base.marine[0]}, 960, 500);
    expect(fills(ctx)).toContain(THEMES.light.marineHighlight);
  });

  test("highlights only the hovered marine area", () => {
    const ctx = recordingContext();
    const base = scene();
    drawScene(ctx, () => {}, {...base, hovered: base.marine[0]}, 960, 500);
    expect(fills(ctx).filter((s) => s === THEMES.light.marineHighlight)).toHaveLength(1);
  });

  test("leaves unhovered countries their palette colour", () => {
    const ctx = recordingContext();
    const base = scene();
    drawScene(ctx, () => {}, {...base, hovered: base.countries[1]}, 960, 500);
    expect(fills(ctx).filter((s) => s === THEMES.light.land[0])).toHaveLength(1);
  });

  // Five 50m features share id `undefined` (Kosovo, Somaliland, N. Cyprus,
  // Indian Ocean Ter., Siachen Glacier). Comparing by id highlighted all of
  // them at once; hover is identity on the picked feature.
  test("highlights only the hovered feature when ids collide", () => {
    const ctx = recordingContext();
    const base = scene({countries: [feature(undefined), feature(undefined)]});
    drawScene(ctx, () => {}, {...base, hovered: base.countries[0]}, 960, 500);
    expect(fills(ctx).filter((s) => s === THEMES.light.highlight)).toHaveLength(1);
  });

  test("uses no highlight colour when nothing is hovered", () => {
    const ctx = recordingContext();
    drawScene(ctx, () => {}, scene(), 960, 500);
    expect(fills(ctx)).not.toContain(THEMES.light.highlight);
  });

  test("finishes with the sphere outline on top", () => {
    const ctx = recordingContext();
    drawScene(ctx, () => {}, scene(), 960, 500);
    expect(ctx.calls.at(-1)).toMatchObject({op: "stroke", style: THEMES.light.outline});
  });

  test("issues a path for every drawable in the scene", () => {
    const ctx = recordingContext();
    const drawn = [];
    drawScene(ctx, (d) => drawn.push(d), scene(), 960, 500);
    // sphere, 2 marine, graticule, 2 countries, sphere outline
    expect(drawn).toHaveLength(7);
  });
});

describe("grouped highlighting", () => {
  const named = (name) => ({type: "Feature", properties: {name}, geometry: null});

  // Natural Earth splits the Pacific and Atlantic into halves that share a
  // name. Highlighting only the half under the cursor looks like a bug.
  test("highlights every marine feature sharing the hovered name", () => {
    const ctx = recordingContext();
    const marine = [named("Pacific Ocean"), named("Pacific Ocean"), named("Coral Sea")];
    drawScene(ctx, () => {}, scene({marine, hovered: marine[0]}), 960, 500);
    expect(fills(ctx).filter((s) => s === THEMES.light.marineHighlight)).toHaveLength(2);
  });

  test("leaves marine areas with a different name untinted", () => {
    const ctx = recordingContext();
    const marine = [named("Pacific Ocean"), named("Coral Sea")];
    drawScene(ctx, () => {}, scene({marine, hovered: marine[0]}), 960, 500);
    expect(fills(ctx).filter((s) => s === THEMES.light.marine)).toHaveLength(1);
  });

  // Australia is two features (mainland and Tasmania) sharing ISO 036.
  test("highlights every part of a multi-part country", () => {
    const ctx = recordingContext();
    const parts = [feature("036"), feature("036"), feature("250")];
    drawScene(ctx, () => {}, scene({countries: parts, hovered: parts[0]}), 960, 500);
    expect(fills(ctx).filter((s) => s === THEMES.light.highlight)).toHaveLength(2);
  });

  // ...but features with no key at all must still fall back to identity, or the
  // five ISO-less territories would light up together again.
  test("falls back to identity when features have no key", () => {
    const ctx = recordingContext();
    const unkeyed = [feature(undefined), feature(undefined)];
    drawScene(ctx, () => {}, scene({countries: unkeyed, hovered: unkeyed[0]}), 960, 500);
    expect(fills(ctx).filter((s) => s === THEMES.light.highlight)).toHaveLength(1);
  });
});

/** Parse "#rrggbb" or "rgba(r, g, b, a)" into {r, g, b, a}. */
function parseColor(css) {
  const hex = css.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  if (hex) return {r: parseInt(hex[1], 16), g: parseInt(hex[2], 16), b: parseInt(hex[3], 16), a: 1};
  const rgba = css.match(/^rgba?\(([^)]+)\)$/);
  const [r, g, b, a = 1] = rgba[1].split(",").map(Number);
  return {r, g, b, a};
}

/** Source-over compositing of `top` onto opaque `bottom`. */
function composite(top, bottom) {
  const t = parseColor(top), b = parseColor(bottom);
  return {
    r: t.r * t.a + b.r * (1 - t.a),
    g: t.g * t.a + b.g * (1 - t.a),
    b: t.b * t.a + b.b * (1 - t.a)
  };
}

const luminance = ({r, g, b}) => 0.2126 * r + 0.7152 * g + 0.0722 * b;

describe("ocean palette", () => {
  // Resting state: the named marine areas must not restyle the ocean. They are
  // there to be picked up on hover, not to draw a patchwork of tinted boxes.
  test("leaves the resting ocean essentially as it is", () => {
    const base = parseColor(THEMES.light.ocean);
    const resting = composite(THEMES.light.marine, THEMES.light.ocean);
    expect(Math.abs(luminance(base) - luminance(resting))).toBeLessThan(12);
  });

  test("deepens the water on hover rather than lightening it", () => {
    const resting = composite(THEMES.light.marine, THEMES.light.ocean);
    const hovered = composite(THEMES.light.marineHighlight, THEMES.light.ocean);
    expect(luminance(hovered)).toBeLessThan(luminance(resting));
  });

  test("hovers to a blue, not a neutral grey or a warm colour", () => {
    const {r, g, b} = parseColor(THEMES.light.marineHighlight);
    expect(b).toBeGreaterThan(r);
    expect(b).toBeGreaterThan(g);
  });

  test("darkens enough on hover to be unmistakable", () => {
    const resting = composite(THEMES.light.marine, THEMES.light.ocean);
    const hovered = composite(THEMES.light.marineHighlight, THEMES.light.ocean);
    expect(luminance(resting) - luminance(hovered)).toBeGreaterThan(25);
  });

  test("but not so far that the ocean turns black", () => {
    const hovered = composite(THEMES.light.marineHighlight, THEMES.light.ocean);
    expect(luminance(hovered)).toBeGreaterThan(110);
  });

  // Distance in colour, not luminance: two colours can be equally bright and
  // still obviously different, so brightness alone is the wrong discriminator.
  test("the hovered ocean is clearly distinct from the resting ocean", () => {
    const resting = composite(THEMES.light.marine, THEMES.light.ocean);
    const hovered = composite(THEMES.light.marineHighlight, THEMES.light.ocean);
    const distance = Math.hypot(
      resting.r - hovered.r, resting.g - hovered.g, resting.b - hovered.b
    );
    expect(distance).toBeGreaterThan(40);
  });

  test("keeps the ocean hover distinct from the country highlight", () => {
    const ocean = composite(THEMES.light.marineHighlight, THEMES.light.ocean);
    const country = parseColor(THEMES.light.highlight);
    const distance = Math.hypot(ocean.r - country.r, ocean.g - country.g, ocean.b - country.b);
    expect(distance).toBeGreaterThan(60);
  });
});

describe("paletteColour", () => {
  const scheme = ["#aaa", "#bbb", "#ccc"];
  const coloured = (colour) => ({type: "Feature", properties: {colour}, geometry: null});

  test("picks the palette entry the build-time colouring chose", () => {
    expect(paletteColour(scheme, coloured(1))).toBe("#bbb");
  });

  test("wraps round if a colouring needs more entries than the palette has", () => {
    expect(paletteColour(scheme, coloured(4))).toBe("#bbb");
  });

  test("falls back to the first entry for an uncoloured feature", () => {
    expect(paletteColour(scheme, {type: "Feature", properties: {}, geometry: null})).toBe("#aaa");
  });

  test("tolerates a feature with no properties at all", () => {
    expect(paletteColour(scheme, {type: "Feature", geometry: null})).toBe("#aaa");
  });

  test("is a pure lookup — the same index always gives the same fill", () => {
    expect(paletteColour(scheme, coloured(2))).toBe(paletteColour(scheme, coloured(2)));
  });
});

describe("dark theme", () => {
  test("ships a dark palette alongside the light one", () => {
    expect(Object.keys(THEMES).sort()).toEqual(["dark", "light"]);
  });

  test("gives both themes the same number of land colours", () => {
    expect(THEMES.dark.land).toHaveLength(THEMES.light.land.length);
  });

  test("keeps nine land colours, matching the graph colouring", () => {
    expect(THEMES.light.land).toHaveLength(9);
  });

  test("uses a darker ocean than the light theme", () => {
    expect(luminance(parseColor(THEMES.dark.ocean)))
      .toBeLessThan(luminance(parseColor(THEMES.light.ocean)));
  });

  test("uses darker land than the light theme", () => {
    const mean = (t) => t.land.reduce((sum, c) => sum + luminance(parseColor(c)), 0) / t.land.length;
    expect(mean(THEMES.dark)).toBeLessThan(mean(THEMES.light));
  });

  test("keeps every dark land colour distinguishable from the dark ocean", () => {
    const ocean = parseColor(THEMES.dark.ocean);
    for (const colour of THEMES.dark.land) {
      const c = parseColor(colour);
      const distance = Math.hypot(c.r - ocean.r, c.g - ocean.g, c.b - ocean.b);
      expect(distance, colour).toBeGreaterThan(30);
    }
  });

  test("keeps borders visible against dark land rather than white-on-dark glare", () => {
    const border = luminance(parseColor(THEMES.dark.border));
    expect(border).toBeLessThan(luminance(parseColor(THEMES.light.border)));
  });

  test("still deepens the water on hover in dark mode", () => {
    const resting = composite(THEMES.dark.marine, THEMES.dark.ocean);
    const hovered = composite(THEMES.dark.marineHighlight, THEMES.dark.ocean);
    const distance = Math.hypot(
      resting.r - hovered.r, resting.g - hovered.g, resting.b - hovered.b
    );
    expect(distance).toBeGreaterThan(25);
  });

  test("paints the scene with whichever theme it is handed", () => {
    const ctx = recordingContext();
    drawScene(ctx, () => {}, scene({theme: THEMES.dark}), 960, 500);
    expect(ctx.calls.filter((c) => c.op === "fill").map((c) => c.style)[0])
      .toBe(THEMES.dark.ocean);
  });

  test("takes land fills from the theme it is handed", () => {
    const ctx = recordingContext();
    drawScene(ctx, () => {}, scene({theme: THEMES.dark}), 960, 500);
    expect(ctx.calls.filter((c) => c.op === "fill").map((c) => c.style))
      .toContain(THEMES.dark.land[0]);
  });
});
