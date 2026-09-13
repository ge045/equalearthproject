// Oblique Equal Earth — an interactive equal-area world map.
// Copyright (C) 2026 Georg Ogris
//
// This program is free software: you can redistribute it and/or modify it
// under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or (at your
// option) any later version. See the LICENSE file, or <https://www.gnu.org/licenses/>.

/**
 * Country metadata registry: key → {name, wikiUrl, wikidata, source}.
 *
 * world-atlas is derived from Natural Earth but strips properties down to a
 * bare `name`, so the richer NAME_EN / WIKIDATAID fields have to come from the
 * full Natural Earth admin-0 dataset and be joined back on the ISO numeric code
 * (which world-atlas keeps as the TopoJSON feature `id`).
 *
 * Five features in the 50m dataset have no ISO numeric code at all — Kosovo,
 * Somaliland, N. Cyprus, Indian Ocean Ter., Siachen Glacier — because they are
 * disputed or unrecognized. Keying those on their (identical, undefined) id
 * would collapse all five onto one entry, so they are keyed by name instead
 * and joined to Natural Earth by name as well.
 */

/** @returns {string|null} zero-padded 3-digit code, or null if unusable */
export function normalizeIso(code) {
  if (code === undefined || code === null || code === "") return null;
  const text = String(code).trim();
  if (text === "-99") return null; // Natural Earth's "no ISO code assigned" sentinel
  const padded = text.padStart(3, "0");
  return /^\d{3}$/.test(padded) ? padded : null;
}

export function wikipediaUrl(name) {
  return `https://en.wikipedia.org/wiki/${encodeURIComponent(name.replace(/ /g, "_"))}`;
}

/** Stable registry key for a feature: its ISO code, else `name:<name>`. */
export function countryKey(feature) {
  const iso = normalizeIso(feature.id);
  if (iso) return iso;
  const name = feature.properties?.name;
  return name ? `name:${name}` : null;
}

/** Look up a feature's metadata, tolerating unpadded ids. */
export function lookupCountry(registry, feature) {
  const key = countryKey(feature);
  return key === null ? undefined : registry[key];
}

/**
 * @param {Array<{id: string|number, properties: {name: string}}>} atlasFeatures
 * @param {Array<{properties: object}>} neFeatures
 */
export function buildRegistry(atlasFeatures, neFeatures) {
  const byIso = new Map();
  const byName = new Map();
  for (const feature of neFeatures) {
    const properties = feature.properties ?? {};
    const iso = normalizeIso(properties.ISO_N3);
    if (iso && !byIso.has(iso)) byIso.set(iso, properties);
    const neName = properties.NAME_EN;
    if (neName && !byName.has(neName.toLowerCase())) byName.set(neName.toLowerCase(), properties);
  }

  const registry = {};
  for (const feature of atlasFeatures) {
    const key = countryKey(feature);
    if (key === null) continue;

    const atlasName = feature.properties?.name;
    const iso = normalizeIso(feature.id);
    const ne = (iso && byIso.get(iso)) || (atlasName && byName.get(atlasName.toLowerCase()));

    const name = ne?.NAME_EN ?? atlasName;
    if (!name) continue;

    const entry = {name, wikiUrl: wikipediaUrl(name), source: ne ? "ne" : "atlas"};
    if (ne?.WIKIDATAID) entry.wikidata = ne.WIKIDATAID;
    registry[key] = entry;
  }
  return registry;
}
