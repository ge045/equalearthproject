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

/**
 * Two palettes. The graph colouring assigns each country an index into `land`,
 * so both themes must offer the same number of entries — nine — or a country
 * would change colour relative to its neighbours when the theme flips.
 *
 * The land colours live here rather than coming from d3's schemes so that the
 * embeddable bundle need not carry d3-scale-chromatic, and so the dark set can
 * be chosen deliberately rather than by washing out a light one.
 */
export const THEMES = {
  light: {
    ocean: "#d4e6f1",
    // At rest the named marine areas barely register — just enough to keep the
    // ocean from being a flat slab. All the colour change happens on hover.
    marine: "rgba(255, 255, 255, 0.10)",
    marineHighlight: "rgba(17, 61, 102, 0.38)",
    graticule: "rgba(255, 255, 255, 0.45)",
    border: "#ffffff",
    highlight: "#f39c12",
    outline: "rgba(31, 62, 87, 0.6)",
    land: [
      "#fbb4ae", "#b3cde3", "#ccebc5", "#decbe4", "#fed9a6",
      "#ffffcc", "#e5d8bd", "#fddaec", "#e8e8e8"
    ]
  },
  dark: {
    ocean: "#0e1b26",
    marine: "rgba(255, 255, 255, 0.05)",
    marineHighlight: "rgba(126, 190, 236, 0.30)",
    graticule: "rgba(255, 255, 255, 0.16)",
    // A dark hairline rather than white: white borders on dark land glare and
    // visually thicken every coastline.
    border: "#0b141c",
    highlight: "#f5a623",
    outline: "rgba(150, 190, 220, 0.55)",
    land: [
      "#8c4f52", "#3f5f7d", "#4a6b4f", "#5d4d6b", "#8a6136",
      "#7d7a45", "#6d6250", "#83566e", "#4f5559"
    ]
  }
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
  const {sphere, graticule, marine, countries, hovered} = scene;
  const theme = scene.theme ?? THEMES.light;

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
  context.fillStyle = theme.ocean;
  context.fill();

  // Named marine areas, barely tinted so the ocean is not a flat slab and the
  // hover highlight has something to land on.
  for (const area of marine) {
    context.beginPath();
    path(area);
    context.fillStyle = isHovered(area) ? theme.marineHighlight : theme.marine;
    context.fill();
  }

  // Graticule
  context.beginPath();
  path(graticule);
  context.strokeStyle = theme.graticule;
  context.lineWidth = 0.5;
  context.stroke();

  // Countries
  for (const feature of countries) {
    context.beginPath();
    path(feature);
    context.fillStyle = isHovered(feature) ? theme.highlight : paletteColour(theme.land, feature);
    context.fill();
    context.strokeStyle = theme.border;
    context.lineWidth = 0.5;
    context.stroke();
  }

  // Sphere outline last, so nothing overdraws the edge of the world
  context.beginPath();
  path(sphere);
  context.strokeStyle = theme.outline;
  context.lineWidth = 1;
  context.stroke();
}
