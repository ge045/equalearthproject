// @vitest-environment jsdom
// Oblique Equal Earth — an interactive equal-area world map.
// Copyright (C) 2026 Georg Ogris
//
// This program is free software: you can redistribute it and/or modify it
// under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or (at your
// option) any later version. See the LICENSE file, or <https://www.gnu.org/licenses/>.

import {describe, expect, test} from "vitest";
import {createInfoBadge} from "../src/components/info-badge.js";

const badge = (text = "Some explanation.") => createInfoBadge(text);

describe("createInfoBadge", () => {
  test("shows a circled information mark", () => {
    expect(badge().querySelector(".eq-badge-mark").textContent).toBe("ℹ");
  });

  test("carries the explanation in a bubble", () => {
    expect(badge("Yaw turns the globe east–west.").querySelector(".eq-bubble").textContent)
      .toBe("Yaw turns the globe east–west.");
  });

  test("is reachable by keyboard, not only by pointer", () => {
    expect(badge().getAttribute("tabindex")).toBe("0");
  });

  test("announces itself to assistive technology", () => {
    const el = badge("Pitch tilts north–south.");
    expect(el.getAttribute("aria-label")).toContain("Pitch tilts north–south.");
  });

  test("sets no title attribute, which would double up with the bubble", () => {
    expect(badge().hasAttribute("title")).toBe(false);
  });

  test("hides the bubble from screen readers, since the label already says it", () => {
    expect(badge().querySelector(".eq-bubble").getAttribute("aria-hidden")).toBe("true");
  });

  test("hides the glyph from screen readers too", () => {
    expect(badge().querySelector(".eq-badge-mark").getAttribute("aria-hidden")).toBe("true");
  });

  test("gives every badge the same class, so one rule styles them all", () => {
    expect(badge().classList.contains("eq-badge")).toBe(true);
  });

  test("can be told which side to open towards", () => {
    expect(createInfoBadge("x", {align: "left"}).dataset.align).toBe("left");
  });

  test("defaults to opening rightwards", () => {
    expect(badge().dataset.align).toBe("right");
  });
});
