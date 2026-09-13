// Oblique Equal Earth — an interactive equal-area world map.
// Copyright (C) 2026 Georg Ogris
//
// This program is free software: you can redistribute it and/or modify it
// under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or (at your
// option) any later version. See the LICENSE file, or <https://www.gnu.org/licenses/>.

// Named marine areas — seven oceans plus seas, gulfs, bays, straits, channels.
// Stripped of Natural Earth's ~35 translated name fields, which are most of the
// payload and none of the use.
import {simplifyMarine} from "../components/marine.js";
import {NATURAL_EARTH} from "../../lib/sources.js";
import {fetchJson} from "../../lib/fetch-json.js";

const marine = await fetchJson(NATURAL_EARTH("ne_50m_geography_marine_polys"));
const features = marine.features
  .filter((f) => f.properties?.name || f.properties?.name_en)
  // Largest first, so smaller seas land on top of the oceans that contain them
  // and win the hit test.
  .sort((a, b) => (a.properties.scalerank ?? 9) - (b.properties.scalerank ?? 9))
  .map(simplifyMarine);

const kinds = {};
for (const f of features) kinds[f.properties.kind] = (kinds[f.properties.kind] ?? 0) + 1;
process.stderr.write(`marine areas: ${features.length} ${JSON.stringify(kinds)}\n`);

process.stdout.write(JSON.stringify({type: "FeatureCollection", features}));
