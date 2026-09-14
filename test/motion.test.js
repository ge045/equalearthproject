// Oblique Equal Earth — an interactive equal-area world map.
// Copyright (C) 2026 Georg Ogris
//
// This program is free software: you can redistribute it and/or modify it
// under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or (at your
// option) any later version. See the LICENSE file, or <https://www.gnu.org/licenses/>.

import {describe, expect, test} from "vitest";
import {prefersReducedMotion} from "../src/components/motion.js";

const media = (matches, expected) => (query) => {
  if (expected) expect(query).toBe(expected);
  return {matches};
};

describe("prefersReducedMotion", () => {
  test("is true when the reader asked to reduce motion", () => {
    expect(prefersReducedMotion(media(true))).toBe(true);
  });

  test("is false when they did not", () => {
    expect(prefersReducedMotion(media(false))).toBe(false);
  });

  test("asks the standard media query", () => {
    prefersReducedMotion(media(true, "(prefers-reduced-motion: reduce)"));
  });

  test("answers no preference where matchMedia does not exist", () => {
    expect(prefersReducedMotion(undefined)).toBe(false);
  });

  test("answers no preference rather than throwing on a hostile matchMedia", () => {
    expect(prefersReducedMotion(() => { throw new Error("nope"); })).toBe(false);
  });
});
