// Oblique Equal Earth — an interactive equal-area world map.
// Copyright (C) 2026 Georg Ogris
//
// This program is free software: you can redistribute it and/or modify it
// under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or (at your
// option) any later version. See the LICENSE file, or <https://www.gnu.org/licenses/>.

// Validates the artefacts the Framework data loaders actually produced.
// Skipped on a fresh clone; run `npm run build` (or `npm run dev`) first.
import {existsSync, readFileSync} from "node:fs";
import {describe, expect, test} from "vitest";
import {countryKey, lookupCountry} from "../src/components/registry.js";

const CACHE = "src/.observablehq/cache/data";
const built = existsSync(`${CACHE}/countries.json`) && existsSync(`${CACHE}/marine.json`);
const read = (name) => JSON.parse(readFileSync(`${CACHE}/${name}.json`, "utf8"));

describe.skipIf(!built)("generated data", () => {
  test("countries covers the world at 50m resolution", () => {
    expect(read("countries").features.length).toBeGreaterThan(200);
  });

  test("Antarctica is on the map", () => {
    expect(read("countries").features.some((f) => f.id === "010")).toBe(true);
  });

  // Five features genuinely lack an ISO numeric code (disputed territories),
  // so the registry keys those by name instead; nothing may go unkeyed.
  test("every country resolves to a registry key", () => {
    const unkeyed = read("countries").features.filter((f) => countryKey(f) === null);
    expect(unkeyed.map((f) => f.properties.name)).toEqual([]);
  });

  test("the registry resolves almost every country to Natural Earth", () => {
    const countries = Object.values(read("wiki")).filter((e) => e.source !== "marine");
    const joined = countries.filter((e) => e.source === "ne").length;
    expect(joined / countries.length).toBeGreaterThan(0.95);
  });

  test("every country on the map has a registry entry", () => {
    const registry = read("wiki");
    const missing = read("countries").features.filter((f) => !lookupCountry(registry, f));
    expect(missing.map((f) => f.properties.name)).toEqual([]);
  });

  test("every registry entry has a usable Wikipedia URL", () => {
    const bad = Object.values(read("wiki"))
      .filter((e) => !e.wikiUrl?.startsWith("https://en.wikipedia.org/wiki/"));
    expect(bad).toEqual([]);
  });

  // The whole point of the graph colouring: verified against the real border
  // graph, not against a fixture.
  test("no two bordering countries share a colour", async () => {
    const {createRequire} = await import("node:module");
    const {neighbors} = await import("topojson-client");
    const require = createRequire(import.meta.url);
    const topology = JSON.parse(readFileSync(require.resolve("world-atlas/countries-50m.json"), "utf8"));
    const geometries = topology.objects.countries.geometries;

    const colours = new Map();
    for (const f of read("countries").features) colours.set(countryKey(f), f.properties.colour);

    const clashes = [];
    neighbors(geometries).forEach((list, index) => {
      const key = countryKey(geometries[index]);
      for (const other of list) {
        const otherKey = countryKey(geometries[other]);
        if (!key || !otherKey || key === otherKey) continue;
        if (colours.get(key) === colours.get(otherKey)) clashes.push(`${key}/${otherKey}`);
      }
    });
    expect(clashes).toEqual([]);
  });

  test("every country carries a palette index", () => {
    const missing = read("countries").features.filter((f) => !Number.isInteger(f.properties.colour));
    expect(missing.map((f) => f.properties.name)).toEqual([]);
  });

  test("uses no more colours than the palette provides", () => {
    const used = new Set(read("countries").features.map((f) => f.properties.colour));
    expect(used.size).toBeLessThanOrEqual(9);
  });

  // Multi-part countries must be one colour, not two.
  test("every part of a multi-part country gets the same colour", () => {
    const byKey = new Map();
    for (const f of read("countries").features) {
      const key = countryKey(f);
      if (!byKey.has(key)) byKey.set(key, new Set());
      byKey.get(key).add(f.properties.colour);
    }
    const split = [...byKey].filter(([, colours]) => colours.size > 1).map(([key]) => key);
    expect(split).toEqual([]);
  });

  test("marine areas cover oceans and their subdivisions", () => {
    expect(read("marine").features.length).toBeGreaterThan(100);
  });

  test("every marine area has a name", () => {
    const unnamed = read("marine").features.filter((f) => !f.properties.name);
    expect(unnamed).toHaveLength(0);
  });

  test("marine names are not left shouting in capitals", () => {
    const shouty = read("marine").features
      .map((f) => f.properties.name)
      .filter((n) => n === n.toUpperCase() && /[A-Z]{2}/.test(n));
    expect(shouty).toEqual([]);
  });

  // The invariant hover depends on: every emitted marine feature must resolve.
  test("every marine area resolves through the registry", () => {
    const registry = read("wiki");
    const missing = read("marine").features.filter((f) => !lookupCountry(registry, f));
    expect(missing.map((f) => f.properties.name)).toEqual([]);
  });

  test("all five named oceans are present and clickable", () => {
    const registry = read("wiki");
    const articles = read("marine").features
      .filter((f) => f.properties.kind === "ocean")
      .map((f) => lookupCountry(registry, f).wikiUrl.replace("https://en.wikipedia.org/wiki/", ""));
    for (const ocean of ["Atlantic_Ocean", "Pacific_Ocean", "Indian_Ocean", "Arctic_Ocean", "Southern_Ocean"]) {
      expect(articles, `${ocean} missing`).toContain(ocean);
    }
  });

  // Natural Earth splits the Atlantic and Pacific into north and south halves.
  // Their `name_en` is already the canonical whole-ocean name, so both halves
  // collapse onto one registry entry and one article.
  test("the split ocean halves resolve to one shared entry", () => {
    const registry = read("wiki");
    for (const ocean of ["Atlantic Ocean", "Pacific Ocean"]) {
      const halves = read("marine").features.filter((f) => f.properties.name === ocean);
      expect(halves.length, `${ocean} halves`).toBeGreaterThan(1);
      const urls = new Set(halves.map((f) => lookupCountry(registry, f).wikiUrl));
      expect([...urls]).toEqual([`https://en.wikipedia.org/wiki/${ocean.replace(" ", "_")}`]);
    }
  });

  test("no alpine artefacts survive", () => {
    expect(existsSync(`${CACHE}/alpine-contours.json`)).toBe(false);
    expect(existsSync(`${CACHE}/alpine-glaciers.json`)).toBe(false);
  });
});
