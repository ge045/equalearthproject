// Oblique Equal Earth — an interactive equal-area world map.
// Copyright (C) 2026 Georg Ogris
//
// This program is free software: you can redistribute it and/or modify it
// under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or (at your
// option) any later version. See the LICENSE file, or <https://www.gnu.org/licenses/>.

import {describe, expect, test} from "vitest";
import {buildRegistry, countryKey, lookupCountry, normalizeIso, wikipediaUrl} from "../src/components/registry.js";

const atlas = (id, name) => ({id, properties: {name}});
const ne = (isoN3, nameEn, wikidata) => ({
  properties: {ISO_N3: isoN3, NAME_EN: nameEn, WIKIDATAID: wikidata}
});

describe("normalizeIso", () => {
  test("pads numeric codes to three digits", () => {
    expect(normalizeIso(40)).toBe("040");
  });

  test("leaves already-padded codes alone", () => {
    expect(normalizeIso("040")).toBe("040");
  });

  test("rejects Natural Earth's -99 sentinel for unmapped countries", () => {
    expect(normalizeIso("-99")).toBeNull();
  });

  test("rejects missing codes", () => {
    expect(normalizeIso(undefined)).toBeNull();
  });
});

describe("wikipediaUrl", () => {
  test("replaces spaces with underscores", () => {
    expect(wikipediaUrl("Bosnia and Herzegovina"))
      .toBe("https://en.wikipedia.org/wiki/Bosnia_and_Herzegovina");
  });

  test("percent-encodes non-ASCII characters", () => {
    expect(wikipediaUrl("Côte d'Ivoire"))
      .toBe("https://en.wikipedia.org/wiki/C%C3%B4te_d'Ivoire");
  });
});

describe("buildRegistry", () => {
  test("joins atlas geometry to Natural Earth properties on ISO numeric", () => {
    const registry = buildRegistry([atlas("040", "Austria")], [ne("040", "Austria", "Q40")]);
    expect(registry["040"]).toMatchObject({
      name: "Austria",
      wikiUrl: "https://en.wikipedia.org/wiki/Austria",
      wikidata: "Q40",
      source: "ne"
    });
  });

  test("matches across differently padded ISO codes", () => {
    const registry = buildRegistry([atlas(40, "Austria")], [ne("040", "Austria", "Q40")]);
    expect(registry["040"].source).toBe("ne");
  });

  test("prefers Natural Earth's English name over the atlas name", () => {
    const registry = buildRegistry(
      [atlas("410", "South Korea")],
      [ne("410", "Republic of Korea", "Q884")]
    );
    expect(registry["410"].name).toBe("Republic of Korea");
  });

  test("falls back to the atlas name when Natural Earth has no match", () => {
    const registry = buildRegistry([atlas("260", "Fr. S. Antarctic Lands")], []);
    expect(registry["260"]).toMatchObject({
      name: "Fr. S. Antarctic Lands",
      source: "atlas"
    });
  });

  test("omits wikidata when Natural Earth has none", () => {
    const registry = buildRegistry([atlas("260", "Somewhere")], []);
    expect(registry["260"].wikidata).toBeUndefined();
  });

  test("skips atlas features with neither an id nor a name", () => {
    const registry = buildRegistry([{id: undefined, properties: {}}], []);
    expect(Object.keys(registry)).toEqual([]);
  });

  test("ignores Natural Earth rows whose ISO code is the -99 sentinel", () => {
    const registry = buildRegistry([atlas("040", "Austria")], [ne("-99", "Somaliland", "Q34754")]);
    expect(registry["040"].source).toBe("atlas");
  });
});

describe("features without an ISO code", () => {
  const kosovo = {id: undefined, properties: {name: "Kosovo"}};
  const nCyprus = {id: undefined, properties: {name: "N. Cyprus"}};

  test("keys an ISO-less feature by name instead of colliding on 'undefined'", () => {
    const registry = buildRegistry([kosovo, nCyprus], []);
    expect(Object.keys(registry).sort()).toEqual(["name:Kosovo", "name:N. Cyprus"]);
  });

  test("still joins an ISO-less feature to Natural Earth by name", () => {
    const registry = buildRegistry([kosovo], [ne("-99", "Kosovo", "Q1246")]);
    expect(registry["name:Kosovo"]).toMatchObject({wikidata: "Q1246", source: "ne"});
  });

  test("matches names case-insensitively", () => {
    const registry = buildRegistry([kosovo], [ne("-99", "KOSOVO", "Q1246")]);
    expect(registry["name:Kosovo"].source).toBe("ne");
  });

  test("gives an ISO-less feature a working Wikipedia link", () => {
    const registry = buildRegistry([kosovo], []);
    expect(registry["name:Kosovo"].wikiUrl).toBe("https://en.wikipedia.org/wiki/Kosovo");
  });
});

describe("lookupCountry", () => {
  test("resolves a feature by its ISO id", () => {
    const registry = buildRegistry([atlas("040", "Austria")], []);
    expect(lookupCountry(registry, {id: "040", properties: {}})?.name).toBe("Austria");
  });

  test("resolves an unpadded id against the padded registry key", () => {
    const registry = buildRegistry([atlas("040", "Austria")], []);
    expect(lookupCountry(registry, {id: 40, properties: {}})?.name).toBe("Austria");
  });

  test("resolves an ISO-less feature by name", () => {
    const registry = buildRegistry([{id: undefined, properties: {name: "Kosovo"}}], []);
    expect(lookupCountry(registry, {id: undefined, properties: {name: "Kosovo"}})?.name).toBe("Kosovo");
  });

  test("returns undefined for a feature it has never seen", () => {
    expect(lookupCountry({}, {id: "999", properties: {name: "Atlantis"}})).toBeUndefined();
  });
});

describe("countryKey", () => {
  test("keys distinct ISO-less features distinctly", () => {
    expect(countryKey({id: undefined, properties: {name: "Kosovo"}}))
      .not.toBe(countryKey({id: undefined, properties: {name: "N. Cyprus"}}));
  });
});
