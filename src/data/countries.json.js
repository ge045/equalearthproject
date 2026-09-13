// Oblique Equal Earth — an interactive equal-area world map.
// Copyright (C) 2026 Georg Ogris
//
// This program is free software: you can redistribute it and/or modify it
// under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or (at your
// option) any later version. See the LICENSE file, or <https://www.gnu.org/licenses/>.

// World political boundaries at 50m resolution, as GeoJSON.
// world-atlas ships as quantized TopoJSON; 50m (not 110m) because the map
// re-centres onto individual continents and 110m visibly falls apart there.
//
// Each feature is tagged with a palette index chosen by graph colouring, so no
// two bordering countries end up the same fill.
import {readFile} from "node:fs/promises";
import {createRequire} from "node:module";
import {feature, neighbors} from "topojson-client";
import {countryKey} from "../components/registry.js";
import {greedyColouring, mergeAdjacency} from "../../lib/graph-colour.js";

const require = createRequire(import.meta.url);
const topology = JSON.parse(await readFile(require.resolve("world-atlas/countries-50m.json"), "utf8"));
const countries = feature(topology, topology.objects.countries);

// neighbors() is per geometry and shares the geometries' order with the
// features, so the two line up index for index.
const geometries = topology.objects.countries.geometries;
const keys = geometries.map((g) => countryKey(g));
const adjacency = mergeAdjacency(neighbors(geometries), keys);
const colours = greedyColouring(adjacency);

for (const f of countries.features) {
  f.properties.colour = colours.get(countryKey(f)) ?? 0;
}

const used = new Set(colours.values()).size;
const borders = [...adjacency.values()].reduce((n, s) => n + s.size, 0) / 2;
process.stderr.write(`countries: ${countries.features.length} features, ${borders} borders, ${used} colours\n`);

process.stdout.write(JSON.stringify(countries));
