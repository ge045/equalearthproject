// Oblique Equal Earth — an interactive equal-area world map.
// Copyright (C) 2026 Georg Ogris
//
// This program is free software: you can redistribute it and/or modify it
// under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or (at your
// option) any later version. See the LICENSE file, or <https://www.gnu.org/licenses/>.

import {describe, expect, test} from "vitest";
import {buildMarineRegistry, marineArticle, marineName, simplifyMarine} from "../src/components/marine.js";
import {countryKey, lookupCountry} from "../src/components/registry.js";

const props = (overrides) => ({
  featurecla: "ocean", name: "Test Sea", wikidataid: null, scalerank: 0, ...overrides
});
const marineFeature = (overrides) => ({
  type: "Feature", properties: props(overrides),
  geometry: {type: "Polygon", coordinates: [[[0, 0], [1, 0], [1, 1], [0, 0]]]}
});

describe("marineName", () => {
  test("title-cases the shouty names Natural Earth ships", () => {
    expect(marineName(props({name: "SOUTHERN OCEAN"}))).toBe("Southern Ocean");
  });

  test("keeps small joining words lowercase", () => {
    expect(marineName(props({name: "GULF OF MEXICO"}))).toBe("Gulf of Mexico");
  });

  test("still capitalises a leading small word", () => {
    expect(marineName(props({name: "OF ISLANDS BAY"}))).toBe("Of Islands Bay");
  });

  test("leaves an already mixed-case name alone", () => {
    expect(marineName(props({name: "North Atlantic Ocean"}))).toBe("North Atlantic Ocean");
  });

  test("prefers the English name when it differs", () => {
    expect(marineName(props({name: "MER DU NORD", name_en: "North Sea"}))).toBe("North Sea");
  });
});

describe("marineArticle", () => {
  test("routes the North Atlantic to the canonical Atlantic Ocean article", () => {
    expect(marineArticle(props({name: "North Atlantic Ocean", wikidataid: "Q97"}))).toBe("Atlantic Ocean");
  });

  test("routes the South Pacific to the canonical Pacific Ocean article", () => {
    expect(marineArticle(props({name: "South Pacific Ocean", wikidataid: "Q98"}))).toBe("Pacific Ocean");
  });

  test("routes the shouty Southern Ocean to its article", () => {
    expect(marineArticle(props({name: "SOUTHERN OCEAN", wikidataid: "Q7354"}))).toBe("Southern Ocean");
  });

  test("falls back to the display name for a sea with no override", () => {
    expect(marineArticle(props({featurecla: "sea", name: "Coral Sea", wikidataid: "Q134183"})))
      .toBe("Coral Sea");
  });
});

describe("simplifyMarine", () => {
  test("drops the three dozen translated name fields", () => {
    const simple = simplifyMarine(marineFeature({name_fr: "x", name_ja: "y", name_zh: "z"}));
    expect(Object.keys(simple.properties).sort()).toEqual(["kind", "name"]);
  });

  test("normalises the name onto the feature itself", () => {
    expect(simplifyMarine(marineFeature({name: "INDIAN OCEAN"})).properties.name).toBe("Indian Ocean");
  });

  test("records the kind of water body for grouping", () => {
    expect(simplifyMarine(marineFeature({featurecla: "gulf"})).properties.kind).toBe("gulf");
  });

  test("keeps the geometry intact", () => {
    expect(simplifyMarine(marineFeature()).geometry.type).toBe("Polygon");
  });
});

describe("buildMarineRegistry", () => {
  const features = [
    marineFeature({name: "North Atlantic Ocean", wikidataid: "Q97"}),
    marineFeature({featurecla: "sea", name: "Coral Sea", wikidataid: "Q134183"})
  ];

  test("gives every marine area a Wikipedia URL", () => {
    const registry = buildMarineRegistry(features);
    expect(registry["name:North Atlantic Ocean"].wikiUrl)
      .toBe("https://en.wikipedia.org/wiki/Atlantic_Ocean");
  });

  test("keeps the local display name distinct from the article it links to", () => {
    expect(buildMarineRegistry(features)["name:North Atlantic Ocean"].name)
      .toBe("North Atlantic Ocean");
  });

  test("records the wikidata id", () => {
    expect(buildMarineRegistry(features)["name:Coral Sea"].wikidata).toBe("Q134183");
  });

  // The invariant that makes hover work: the key the registry stores under must
  // be exactly the key countryKey() derives from the emitted feature.
  test("keys entries so the simplified features resolve through lookupCountry", () => {
    const registry = buildMarineRegistry(features);
    for (const feature of features.map(simplifyMarine)) {
      expect(lookupCountry(registry, feature), countryKey(feature)).toBeDefined();
    }
  });
});
