// Oblique Equal Earth — an interactive equal-area world map.
// Copyright (C) 2026 Georg Ogris
//
// This program is free software: you can redistribute it and/or modify it
// under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or (at your
// option) any later version. See the LICENSE file, or <https://www.gnu.org/licenses/>.

import {describe, expect, test} from "vitest";
import {greedyColouring, mergeAdjacency} from "../lib/graph-colour.js";

/** Adjacency as a plain object, for readable fixtures. */
const graph = (obj) => new Map(Object.entries(obj).map(([k, v]) => [k, new Set(v)]));

describe("mergeAdjacency", () => {
  // TopoJSON neighbours are per *geometry*. Australia is two geometries sharing
  // ISO 036, so the graph has to be collapsed onto country keys first or the
  // mainland and Tasmania could end up different colours.
  test("collapses geometries that share a key into one node", () => {
    const merged = mergeAdjacency([[1], [0]], ["036", "036"]);
    expect([...merged.keys()]).toEqual(["036"]);
  });

  test("drops the self-loop between parts of one country", () => {
    const merged = mergeAdjacency([[1], [0]], ["036", "036"]);
    expect([...merged.get("036")]).toEqual([]);
  });

  test("carries a neighbour relation onto the merged key", () => {
    // geometry 0 and 1 are both France; geometry 2 is Spain, touching part 1
    const merged = mergeAdjacency([[1], [0, 2], [1]], ["250", "250", "724"]);
    expect([...merged.get("250")]).toEqual(["724"]);
    expect([...merged.get("724")]).toEqual(["250"]);
  });

  test("keeps adjacency symmetric", () => {
    const merged = mergeAdjacency([[1], [0]], ["040", "250"]);
    expect(merged.get("040").has("250")).toBe(true);
    expect(merged.get("250").has("040")).toBe(true);
  });

  test("still lists an island with no neighbours", () => {
    const merged = mergeAdjacency([[], []], ["554", "036"]);
    expect([...merged.keys()].sort()).toEqual(["036", "554"]);
  });

  test("ignores geometries with no usable key", () => {
    const merged = mergeAdjacency([[1], [0]], [null, "250"]);
    expect([...merged.keys()]).toEqual(["250"]);
  });
});

describe("greedyColouring", () => {
  const noClash = (adjacency, colours) => {
    for (const [node, neighbours] of adjacency) {
      for (const other of neighbours) {
        if (colours.get(node) === colours.get(other)) return `${node}/${other}`;
      }
    }
    return null;
  };

  test("gives an isolated node the first colour", () => {
    expect(greedyColouring(graph({a: []})).get("a")).toBe(0);
  });

  test("never gives two touching nodes the same colour", () => {
    const adjacency = graph({a: ["b", "c"], b: ["a", "c"], c: ["a", "b"]});
    expect(noClash(adjacency, greedyColouring(adjacency))).toBeNull();
  });

  test("can colour a chain with just two when the palette allows only two", () => {
    const adjacency = graph({a: ["b"], b: ["a", "c"], c: ["b", "d"], d: ["c"]});
    expect(new Set(greedyColouring(adjacency, 2).values()).size).toBe(2);
  });

  // Minimising colours is explicitly not the goal — spreading them is, so that
  // no single fill dominates. A chain could be done in two and should not be.
  test("spreads a chain across a wider palette rather than minimising", () => {
    const adjacency = graph({a: ["b"], b: ["a", "c"], c: ["b", "d"], d: ["c"]});
    expect(new Set(greedyColouring(adjacency, 6).values()).size).toBeGreaterThan(2);
  });

  test("needs three for a triangle", () => {
    const adjacency = graph({a: ["b", "c"], b: ["a", "c"], c: ["a", "b"]});
    expect(new Set(greedyColouring(adjacency).values()).size).toBe(3);
  });

  test("colours a node whose neighbours are missing from the graph", () => {
    expect(greedyColouring(graph({a: ["ghost"]})).get("a")).toBe(0);
  });

  test("is deterministic, so a rebuild does not reshuffle the map", () => {
    const adjacency = graph({a: ["b", "c"], b: ["a", "c"], c: ["a", "b"], d: ["a"]});
    expect([...greedyColouring(adjacency)]).toEqual([...greedyColouring(adjacency)]);
  });

  test("handles an empty graph", () => {
    expect([...greedyColouring(new Map())]).toEqual([]);
  });

  test("assigns a colour to every node", () => {
    const adjacency = graph({a: ["b"], b: ["a"], c: []});
    const colours = greedyColouring(adjacency);
    expect([...adjacency.keys()].every((k) => Number.isInteger(colours.get(k)))).toBe(true);
  });
});

describe("colour balance", () => {
  const counts = (colours) => {
    const tally = new Map();
    for (const c of colours.values()) tally.set(c, (tally.get(c) ?? 0) + 1);
    return tally;
  };

  // Always taking the lowest free colour dumps every low-degree node onto
  // colour 0, so one fill ends up dominating the map even though the colouring
  // is technically valid.
  test("spreads isolated nodes across the whole palette", () => {
    const isolated = new Map(
      Array.from({length: 40}, (_, i) => [`n${i}`, new Set()])
    );
    const tally = counts(greedyColouring(isolated, 4));
    expect(tally.size).toBe(4);
    expect(Math.max(...tally.values()) - Math.min(...tally.values())).toBeLessThanOrEqual(1);
  });

  test("still never gives two touching nodes the same colour when balancing", () => {
    // A ring of 9 nodes, plus isolated ones to tempt the balancer.
    const adjacency = new Map();
    for (let i = 0; i < 9; i++) adjacency.set(`r${i}`, new Set([`r${(i + 1) % 9}`, `r${(i + 8) % 9}`]));
    for (let i = 0; i < 20; i++) adjacency.set(`i${i}`, new Set());
    const colours = greedyColouring(adjacency, 5);
    for (const [node, neighbours] of adjacency) {
      for (const other of neighbours) {
        expect(colours.get(node), `${node}/${other}`).not.toBe(colours.get(other));
      }
    }
  });

  test("respects the palette size when it can", () => {
    const isolated = new Map(Array.from({length: 30}, (_, i) => [`n${i}`, new Set()]));
    const used = new Set(greedyColouring(isolated, 3).values());
    expect([...used].sort()).toEqual([0, 1, 2]);
  });

  // Correctness wins over the palette size: a node with more neighbours than
  // the palette has colours must still get a distinct one.
  test("exceeds the palette rather than producing a clash", () => {
    const hub = new Map([["hub", new Set(["a", "b", "c", "d"])]]);
    for (const n of ["a", "b", "c", "d"]) hub.set(n, new Set(["hub", ...["a", "b", "c", "d"].filter((x) => x !== n)]));
    const colours = greedyColouring(hub, 2);
    expect(new Set(colours.values()).size).toBeGreaterThan(2);
  });

  test("stays deterministic while balancing", () => {
    const adjacency = new Map(Array.from({length: 25}, (_, i) => [`n${i}`, new Set()]));
    expect([...greedyColouring(adjacency, 4)]).toEqual([...greedyColouring(adjacency, 4)]);
  });
});
