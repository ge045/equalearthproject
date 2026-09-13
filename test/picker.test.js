// Oblique Equal Earth — an interactive equal-area world map.
// Copyright (C) 2026 Georg Ogris
//
// This program is free software: you can redistribute it and/or modify it
// under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or (at your
// option) any later version. See the LICENSE file, or <https://www.gnu.org/licenses/>.

import {beforeEach, describe, expect, test} from "vitest";
import {HitTester, colorToIndex, indexToColor} from "../src/components/picker.js";

/** Records every drawing call so we can assert on what the picker emitted. */
function fakeContext(pixel = [0, 0, 0, 255]) {
  const calls = [];
  return {
    calls,
    fillStyle: null,
    strokeStyle: null,
    clearRect: (...a) => calls.push(["clearRect", ...a]),
    beginPath() { calls.push(["beginPath"]); },
    fill() { calls.push(["fill", this.fillStyle]); },
    stroke() { calls.push(["stroke"]); },
    getImageData: () => ({data: Uint8ClampedArray.from(pixel)})
  };
}

describe("indexToColor / colorToIndex", () => {
  test("encodes the first feature as a colour distinct from the background", () => {
    expect(indexToColor(0)).toBe("#000001");
  });

  test("encodes across the green channel boundary", () => {
    expect(indexToColor(255)).toBe("#000100");
  });

  test("round-trips every channel boundary", () => {
    for (const i of [0, 1, 254, 255, 256, 65534, 65535, 65536, 1000000]) {
      const hex = indexToColor(i);
      const [r, g, b] = [1, 3, 5].map((o) => parseInt(hex.slice(o, o + 2), 16));
      expect(colorToIndex(r, g, b)).toBe(i);
    }
  });

  test("reads the untouched background as no hit", () => {
    expect(colorToIndex(0, 0, 0)).toBe(-1);
  });
});

describe("HitTester", () => {
  let context, tester;

  beforeEach(() => {
    context = fakeContext();
    tester = new HitTester(context, 960, 500);
  });

  test("fills one flat colour per feature, in index order", () => {
    tester.render(["a", "b", "c"], () => {});
    const fills = context.calls.filter(([name]) => name === "fill").map(([, style]) => style);
    expect(fills).toEqual(["#000001", "#000002", "#000003"]);
  });

  test("never strokes, which would blend two indices into a third", () => {
    tester.render(["a", "b"], () => {});
    expect(context.calls.some(([name]) => name === "stroke")).toBe(false);
  });

  test("clears the buffer before redrawing so stale indices cannot be picked", () => {
    tester.render(["a"], () => {});
    expect(context.calls[0]).toEqual(["clearRect", 0, 0, 960, 500]);
  });

  test("builds each feature's path before filling it", () => {
    const drawn = [];
    tester.render(["a", "b"], (feature) => drawn.push(feature));
    expect(drawn).toEqual(["a", "b"]);
  });

  test("returns the feature under the cursor", () => {
    const hit = new HitTester(fakeContext([0, 0, 2, 255]), 960, 500);
    hit.render(["a", "b", "c"], () => {});
    expect(hit.pick(10, 10)).toBe("b");
  });

  test("returns null over the background", () => {
    tester.render(["a", "b"], () => {});
    expect(tester.pick(10, 10)).toBeNull();
  });

  test("returns null when the encoded index is past the end of the features", () => {
    const hit = new HitTester(fakeContext([0, 0, 99, 255]), 960, 500);
    hit.render(["a"], () => {});
    expect(hit.pick(10, 10)).toBeNull();
  });
});
