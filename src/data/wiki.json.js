// Oblique Equal Earth — an interactive equal-area world map.
// Copyright (C) 2026 Georg Ogris
//
// This program is free software: you can redistribute it and/or modify it
// under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or (at your
// option) any later version. See the LICENSE file, or <https://www.gnu.org/licenses/>.

// ISO numeric -> {name, wikiUrl, wikidata}.
// world-atlas keeps the ISO numeric code as the feature id but strips every
// other property, so the English names and Wikidata ids are joined back in
// from the full Natural Earth admin-0 dataset.
import {readFile} from "node:fs/promises";
import {createRequire} from "node:module";
import {feature} from "topojson-client";
import {NATURAL_EARTH} from "../../lib/sources.js";
import {fetchJson} from "../../lib/fetch-json.js";
import {buildRegistry} from "../components/registry.js";
import {buildMarineRegistry} from "../components/marine.js";

const require = createRequire(import.meta.url);
const topology = JSON.parse(await readFile(require.resolve("world-atlas/countries-50m.json"), "utf8"));
const atlas = feature(topology, topology.objects.countries).features;

const ne = await fetchJson(NATURAL_EARTH("ne_50m_admin_0_countries"));
const registry = buildRegistry(atlas, ne.features);

// Marine areas share the registry: they key as `name:<display>`, which cannot
// collide with the three-digit ISO keys the countries use.
const marine = await fetchJson(NATURAL_EARTH("ne_50m_geography_marine_polys"));
Object.assign(registry, buildMarineRegistry(marine.features));

const total = Object.keys(registry).length;
const matched = Object.values(registry).filter((e) => e.source === "ne").length;
const marineCount = Object.values(registry).filter((e) => e.source === "marine").length;
process.stderr.write(`registry: ${total} entries, ${matched} countries joined to NE, ${marineCount} marine\n`);

process.stdout.write(JSON.stringify(registry));
