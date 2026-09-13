// Oblique Equal Earth — an interactive equal-area world map.
// Copyright (C) 2026 Georg Ogris
//
// This program is free software: you can redistribute it and/or modify it
// under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or (at your
// option) any later version. See the LICENSE file, or <https://www.gnu.org/licenses/>.

/**
 * Named marine areas from Natural Earth's `geography_marine_polys`: seven
 * oceans plus seas, gulfs, bays, straits and channels.
 *
 * Two quirks in the source data have to be smoothed over. Some names ship in
 * capitals ("SOUTHERN OCEAN"), and the ocean features are split into halves
 * that share one Wikidata id — "North Atlantic Ocean" and "South Atlantic
 * Ocean" are both Q97, the single Atlantic Ocean article. So the label shown to
 * the reader and the article linked to are deliberately allowed to differ.
 */
import {wikipediaUrl} from "./registry.js";

/** Wikidata id -> canonical English Wikipedia article. */
const ARTICLE_BY_WIKIDATA = {
  Q97: "Atlantic Ocean",
  Q98: "Pacific Ocean",
  Q788: "Arctic Ocean",
  Q1239: "Indian Ocean",
  Q7354: "Southern Ocean"
};

const SMALL_WORDS = new Set(["of", "the", "and", "de", "la", "del", "du", "in", "on"]);

const isShouty = (text) => text === text.toUpperCase() && /[A-Z]{2}/.test(text);

function titleCase(text) {
  return text
    .toLowerCase()
    .split(/(\s+|-)/)
    .map((token, index) =>
      /^\s+$|^-$/.test(token) || (index > 0 && SMALL_WORDS.has(token))
        ? token
        : token.charAt(0).toUpperCase() + token.slice(1)
    )
    .join("");
}

/** Display name: the English field when it is usable, de-shouted. */
export function marineName(properties) {
  const candidate = properties.name_en && !isShouty(properties.name_en)
    ? properties.name_en
    : properties.name ?? "";
  return isShouty(candidate) ? titleCase(candidate) : candidate;
}

/** The Wikipedia article this area should link to. */
export function marineArticle(properties) {
  return ARTICLE_BY_WIKIDATA[properties.wikidataid] ?? marineName(properties);
}

/**
 * Strip the ~35 translated name fields, keeping only what the map needs.
 * `name` is normalised onto the feature so countryKey() derives the same key
 * the registry is built under.
 */
export function simplifyMarine(feature) {
  return {
    type: "Feature",
    properties: {name: marineName(feature.properties), kind: feature.properties.featurecla},
    geometry: feature.geometry
  };
}

export function buildMarineRegistry(features) {
  const registry = {};
  for (const {properties} of features) {
    const name = marineName(properties);
    if (!name) continue;
    const entry = {
      name,
      wikiUrl: wikipediaUrl(marineArticle(properties)),
      source: "marine",
      kind: properties.featurecla
    };
    if (properties.wikidataid) entry.wikidata = properties.wikidataid;
    registry[`name:${name}`] = entry;
  }
  return registry;
}
