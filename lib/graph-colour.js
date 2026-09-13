// Oblique Equal Earth — an interactive equal-area world map.
// Copyright (C) 2026 Georg Ogris
//
// This program is free software: you can redistribute it and/or modify it
// under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or (at your
// option) any later version. See the LICENSE file, or <https://www.gnu.org/licenses/>.

/**
 * Map colouring, so that no two bordering countries share a fill.
 *
 * The four-colour theorem guarantees four are enough for any planar map; a
 * greedy pass typically uses five or six, which is comfortably inside a nine
 * colour palette. Without this the fills come out of an ordinal scale in
 * whatever order features happen to be encountered, and neighbours collide by
 * chance — roughly one border in nine.
 */

/**
 * Collapse a per-geometry neighbour list onto country keys.
 *
 * topojson.neighbors() works on geometries, but a country can be several
 * geometries (Australia's mainland and Tasmania both carry ISO 036). Colouring
 * the geometries directly could paint one country two colours.
 *
 * @param {number[][]} neighbours per-geometry neighbour indices
 * @param {(string|null)[]} keys per-geometry country key
 * @returns {Map<string, Set<string>>}
 */
export function mergeAdjacency(neighbours, keys) {
  const adjacency = new Map();
  const nodeFor = (key) => {
    if (!adjacency.has(key)) adjacency.set(key, new Set());
    return adjacency.get(key);
  };

  keys.forEach((key, index) => {
    if (key == null) return;
    const node = nodeFor(key);
    for (const other of neighbours[index] ?? []) {
      const otherKey = keys[other];
      if (otherKey == null || otherKey === key) continue; // self-loop between own parts
      node.add(otherKey);
      nodeFor(otherKey).add(key);
    }
  });

  return adjacency;
}

/**
 * Welsh–Powell greedy colouring, balanced across the palette.
 *
 * The most-constrained nodes are coloured first. Among the colours a node's
 * neighbours have not already taken, it gets the one used *least often so far*
 * rather than the lowest-numbered one. Taking the lowest is the textbook rule
 * and it is valid, but it dumps every low-degree node — islands, Australia,
 * Antarctica — onto colour 0, so a single fill visibly dominates the map.
 *
 * `paletteSize` is a preference, not a cap: if every colour in the palette is
 * taken by a node's neighbours it gets a new one, because a correct colouring
 * matters more than staying inside the palette.
 *
 * Ties are broken by key and by colour index so the result is stable —
 * otherwise every rebuild would reshuffle the whole map.
 *
 * @param {Map<string, Set<string>>} adjacency
 * @param {number} paletteSize how many colours to spread across
 * @returns {Map<string, number>} key -> palette index
 */
export function greedyColouring(adjacency, paletteSize = 9) {
  const order = [...adjacency.keys()].sort((a, b) => {
    const degree = adjacency.get(b).size - adjacency.get(a).size;
    return degree !== 0 ? degree : a.localeCompare(b);
  });

  const colours = new Map();
  const usage = new Array(paletteSize).fill(0);

  for (const node of order) {
    const taken = new Set();
    for (const neighbour of adjacency.get(node)) {
      if (colours.has(neighbour)) taken.add(colours.get(neighbour));
    }

    let chosen = -1;
    for (let colour = 0; colour < usage.length; colour++) {
      if (taken.has(colour)) continue;
      if (chosen === -1 || usage[colour] < usage[chosen]) chosen = colour;
    }

    if (chosen === -1) {
      // Every colour so far is spoken for; extend the palette rather than clash.
      chosen = usage.length;
      while (taken.has(chosen)) chosen++;
      while (usage.length <= chosen) usage.push(0);
    }

    colours.set(node, chosen);
    usage[chosen]++;
  }
  return colours;
}
