// Oblique Equal Earth — an interactive equal-area world map.
// Copyright (C) 2026 Georg Ogris
//
// This program is free software: you can redistribute it and/or modify it
// under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or (at your
// option) any later version. See the LICENSE file, or <https://www.gnu.org/licenses/>.

/**
 * Canvas painting for the map — deliberately free of d3 and of the DOM.
 *
 * Keeping the frame painter separate from the event/DOM wiring means the layer
 * order can be asserted against a recording fake context, and the exact same
 * code path can be driven headlessly to produce snapshot images.
 */
import {countryKey} from "./registry.js";

export const THEME = {
  ocean: "#d4e6f1",
  // At rest the named marine areas barely register — just enough to keep the
  // ocean from being a flat slab. All the colour change happens on hover, where
  // the water deepens to a darker blue rather than taking the land's amber.
  marine: "rgba(255, 255, 255, 0.10)",
  marineHighlight: "rgba(17, 61, 102, 0.38)",
  graticule: "rgba(255, 255, 255, 0.45)",
  border: "#ffffff",
  highlight: "#f39c12",
  outline: "rgba(31, 62, 87, 0.6)"
};

/**
 * Fill for a country, from the palette index chosen at build time by graph
 * colouring (see lib/graph-colour.js). Kept here rather than in map.js so the
 * browser and the headless snapshot script cannot drift apart — they did once,
 * and the snapshots silently kept rendering the old ordinal scheme.
 */
export function paletteColour(scheme, feature) {
  const index = feature.properties?.colour;
  return scheme[(Number.isInteger(index) ? index : 0) % scheme.length];
}

/**
 * Paint one frame. Pure with respect to `context` and `path`, which is what
 * lets the layer order be asserted in tests against a recording fake context.
 *
 * @param {CanvasRenderingContext2D} context
 * @param {(d: any) => void} path issues path commands for one GeoJSON object
 */
export function drawScene(context, path, scene, width, height) {
  const {sphere, graticule, marine, countries, hovered, colorFor} = scene;

  // Highlight by registry key, not object identity: Natural Earth splits the
  // Pacific and Atlantic into same-named halves, and Australia is two features
  // sharing ISO 036 — lighting only the piece under the cursor reads as a bug.
  // Features with no derivable key fall back to identity, so the five ISO-less
  // territories cannot light up together.
  const hoveredKey = hovered ? countryKey(hovered) : null;
  const isHovered = (feature) =>
    feature === hovered || (hoveredKey !== null && countryKey(feature) === hoveredKey);

  context.clearRect(0, 0, width, height);

  // Ocean base
  context.beginPath();
  path(sphere);
  context.fillStyle = THEME.ocean;
  context.fill();

  // Named marine areas, barely tinted so the ocean is not a flat slab and the
  // hover highlight has something to land on.
  for (const area of marine) {
    context.beginPath();
    path(area);
    context.fillStyle = isHovered(area) ? THEME.marineHighlight : THEME.marine;
    context.fill();
  }

  // Graticule
  context.beginPath();
  path(graticule);
  context.strokeStyle = THEME.graticule;
  context.lineWidth = 0.5;
  context.stroke();

  // Countries
  for (const feature of countries) {
    context.beginPath();
    path(feature);
    context.fillStyle = isHovered(feature) ? THEME.highlight : colorFor(feature);
    context.fill();
    context.strokeStyle = THEME.border;
    context.lineWidth = 0.5;
    context.stroke();
  }

  // Sphere outline last, so nothing overdraws the edge of the world
  context.beginPath();
  path(sphere);
  context.strokeStyle = THEME.outline;
  context.lineWidth = 1;
  context.stroke();
}
