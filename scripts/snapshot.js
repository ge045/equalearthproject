// Oblique Equal Earth — an interactive equal-area world map.
// Copyright (C) 2026 Georg Ogris
//
// This program is free software: you can redistribute it and/or modify it
// under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or (at your
// option) any later version. See the LICENSE file, or <https://www.gnu.org/licenses/>.

/**
 * Render the map headlessly to PNG, through the same drawScene() the browser
 * uses. Requires the optional `canvas` dependency and a populated data cache
 * (run `npm run build` first).
 *
 *   node scripts/snapshot.js [outDir]
 */
import {mkdirSync, readFileSync, writeFileSync} from "node:fs";
import {join} from "node:path";
import * as d3 from "d3";
import {drawScene, paletteColour} from "../src/components/scene.js";
import {ALL_VIEWS} from "../src/components/views.js";

const {createCanvas} = await import("canvas").catch(() => {
  console.error("scripts/snapshot.js needs canvas. Install it ad hoc:\n  npm install --no-save --legacy-peer-deps canvas");
  process.exit(1);
});

const CACHE = "src/.observablehq/cache/data";
const read = (name) => JSON.parse(readFileSync(join(CACHE, `${name}.json`), "utf8"));

const countries = read("countries").features;
const marine = read("marine").features;

const scene = {
  sphere: {type: "Sphere"},
  graticule: d3.geoGraticule10(),
  marine,
  countries,
  hovered: null,
  colorFor: (f) => paletteColour(d3.schemePastel1, f)
};

const WIDTH = 960, HEIGHT = 500;
const named = (name) => ALL_VIEWS.find((v) => v.name === name);

const shots = [
  // The opening view: Greenwich front, upside down. Mirrors INITIAL_ROTATION.
  {name: "00-opening-view", rotate: [0, 0, 180]},
  // A spread of preset views, drawn straight from the catalogue.
  ...[
    "Atlantic centred", "Pacific centred", "North Pole", "South Pole",
    "Antarctica whole", "Southern Ocean", "Point Nemo", "Land hemisphere",
    "Pacific Ring of Fire", "Greenland ice sheet", "Diagonal Pacific", "Equator vertical"
  ].map((name, i) => {
    const view = named(name);
    if (!view) throw new Error(`No such view in the catalogue: ${name}`);
    return {name: `${String(i + 1).padStart(2, "0")}-${name.toLowerCase().replace(/\W+/g, "-")}`,
            rotate: view.rotation};
  }),
  // Hover states, to check both highlight paths.
  {name: "90-hover-country", rotate: [0, 0, 0], hover: (f) => f.properties?.name === "Brazil"},
  {name: "91-hover-ocean", rotate: [160, 0, 0], hoverMarine: (f) => f.properties.name === "Pacific Ocean"}
];

const outDir = process.argv[2] ?? "snapshots";
mkdirSync(outDir, {recursive: true});

for (const shot of shots) {
  const width = shot.width ?? WIDTH;
  const height = shot.height ?? HEIGHT;
  const canvas = createCanvas(width, height);
  const context = canvas.getContext("2d");
  const projection = d3.geoEqualEarth()
    .scale(shot.scale ?? 170)
    .translate([width / 2, height / 2])
    .rotate(shot.rotate);
  const path = d3.geoPath(projection, context);

  const hovered = shot.hover ? countries.find(shot.hover)
    : shot.hoverMarine ? marine.find(shot.hoverMarine)
    : null;
  drawScene(context, path, {...scene, hovered}, width, height);

  const file = join(outDir, `${shot.name}.png`);
  writeFileSync(file, canvas.toBuffer("image/png"));
  console.log(`${file}  rotate=[${shot.rotate.map((v) => v.toFixed(0))}]`);
}
