// Oblique Equal Earth — an interactive equal-area world map.
// Copyright (C) 2026 Georg Ogris
//
// This program is free software: you can redistribute it and/or modify it
// under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or (at your
// option) any later version. See the LICENSE file, or <https://www.gnu.org/licenses/>.

import {describe, expect, test} from "vitest";
import {geoEqualEarth} from "d3-geo";
import {ALL_VIEWS, VIEW_GROUPS} from "../src/components/views.js";
import {wikipediaUrl} from "../src/components/registry.js";

describe("view catalogue", () => {
  test("is grouped one level deep", () => {
    expect(VIEW_GROUPS.length).toBeGreaterThanOrEqual(6);
  });

  test("gives every group a name and an explanatory blurb", () => {
    for (const group of VIEW_GROUPS) {
      expect(group.name, JSON.stringify(group.name)).toBeTruthy();
      expect(group.blurb?.length, group.name).toBeGreaterThan(20);
    }
  });

  test("puts at least three views in every group", () => {
    for (const group of VIEW_GROUPS) {
      expect(group.views.length, group.name).toBeGreaterThanOrEqual(3);
    }
  });

  test("is exhaustive enough to be worth browsing", () => {
    expect(ALL_VIEWS.length).toBeGreaterThanOrEqual(40);
  });

  test("flattens every group's views into ALL_VIEWS", () => {
    const counted = VIEW_GROUPS.reduce((sum, g) => sum + g.views.length, 0);
    expect(ALL_VIEWS).toHaveLength(counted);
  });

  test("tags each flattened view with its group", () => {
    for (const view of ALL_VIEWS) expect(view.group, view.name).toBeTruthy();
  });

  test("gives every view a teaching note", () => {
    for (const view of ALL_VIEWS) {
      expect(view.note?.length, view.name).toBeGreaterThan(20);
    }
  });

  test("uses a unique name for every view", () => {
    const names = ALL_VIEWS.map((v) => v.name);
    expect(names.filter((n, i) => names.indexOf(n) !== i)).toEqual([]);
  });

  // A duplicated rotation almost always means a copy-paste slip in the catalogue.
  test("uses a distinct rotation for every view", () => {
    const keys = ALL_VIEWS.map((v) => v.rotation.join(","));
    expect(keys.filter((k, i) => keys.indexOf(k) !== i)).toEqual([]);
  });

  test("gives every view three finite rotation angles", () => {
    for (const view of ALL_VIEWS) {
      expect(view.rotation, view.name).toHaveLength(3);
      expect(view.rotation.every(Number.isFinite), view.name).toBe(true);
    }
  });

  test("every rotation actually projects the map onto the canvas", () => {
    for (const view of ALL_VIEWS) {
      const projection = geoEqualEarth().scale(170).translate([480, 250]).rotate(view.rotation);
      const centre = projection(view.rotation.slice(0, 2).map((a) => -a));
      expect(centre?.every(Number.isFinite), view.name).toBe(true);
      expect(Math.abs(centre[0] - 480), view.name).toBeLessThan(1);
      expect(Math.abs(centre[1] - 250), view.name).toBeLessThan(1);
    }
  });
});

/** Rough sentence split: terminal punctuation followed by a space or the end. */
const sentences = (text) =>
  text.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean);

describe("view explanations", () => {
  test("every view carries an explanation", () => {
    const missing = ALL_VIEWS.filter((v) => !v.explanation).map((v) => v.name);
    expect(missing).toEqual([]);
  });

  test("every explanation runs to at least three sentences", () => {
    const tooShort = ALL_VIEWS
      .filter((v) => sentences(v.explanation).length < 3)
      .map((v) => `${v.name} (${sentences(v.explanation).length})`);
    expect(tooShort).toEqual([]);
  });

  test("no explanation runs past five sentences", () => {
    const tooLong = ALL_VIEWS
      .filter((v) => sentences(v.explanation).length > 5)
      .map((v) => `${v.name} (${sentences(v.explanation).length})`);
    expect(tooLong).toEqual([]);
  });

  // Popular-science register: short sentences, not academic paragraphs.
  test("keeps sentences readable", () => {
    const dense = [];
    for (const view of ALL_VIEWS) {
      for (const sentence of sentences(view.explanation)) {
        const words = sentence.split(/\s+/).length;
        if (words > 32) dense.push(`${view.name}: ${words} words`);
      }
    }
    expect(dense).toEqual([]);
  });

  test("keeps the short note distinct from the long explanation", () => {
    const same = ALL_VIEWS.filter((v) => v.note === v.explanation).map((v) => v.name);
    expect(same).toEqual([]);
  });

  test("writes a unique explanation for every view", () => {
    const texts = ALL_VIEWS.map((v) => v.explanation);
    expect(texts.filter((t, i) => texts.indexOf(t) !== i)).toEqual([]);
  });

  test("leaves no placeholder text behind", () => {
    const placeholders = ALL_VIEWS
      .filter((v) => /\bTODO\b|\bTBD\b|lorem ipsum/i.test(v.explanation))
      .map((v) => v.name);
    expect(placeholders).toEqual([]);
  });
});

describe("view further reading", () => {
  test("every view points at a Wikipedia article", () => {
    const missing = ALL_VIEWS.filter((v) => !v.wiki).map((v) => v.name);
    expect(missing).toEqual([]);
  });

  test("article titles are plain titles, not URLs", () => {
    const urls = ALL_VIEWS.filter((v) => /^https?:|\//.test(v.wiki)).map((v) => v.name);
    expect(urls).toEqual([]);
  });

  test("every article title builds a usable en.wikipedia URL", () => {
    for (const view of ALL_VIEWS) {
      expect(wikipediaUrl(view.wiki), view.name).toMatch(/^https:\/\/en\.wikipedia\.org\/wiki\/\S+$/);
    }
  });

  test("no article title is left blank or whitespace", () => {
    const blank = ALL_VIEWS.filter((v) => !v.wiki.trim()).map((v) => v.name);
    expect(blank).toEqual([]);
  });
});
