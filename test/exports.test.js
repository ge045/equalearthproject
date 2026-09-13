// Oblique Equal Earth — an interactive equal-area world map.
// Copyright (C) 2026 Georg Ogris
//
// This program is free software: you can redistribute it and/or modify it
// under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or (at your
// option) any later version. See the LICENSE file, or <https://www.gnu.org/licenses/>.

/**
 * Browsers resolve `export {x} from "./m.js"` at link time and refuse the whole
 * module if `m.js` has no `x`. Vite/esbuild does NOT check this, so a stale
 * re-export passes every unit test and then fails only in the browser:
 *
 *   SyntaxError: The requested module './scene.js' does not provide an export
 *   named 'shadeForElevation'
 *
 * Verify the re-export graph statically instead.
 */
import {readFileSync, globSync} from "node:fs";
import {dirname, resolve} from "node:path";
import {describe, expect, test} from "vitest";

const files = globSync("src/components/*.js");

/** Every name a module exports. */
function exportsOf(file) {
  const code = readFileSync(file, "utf8");
  const names = new Set();
  for (const [, name] of code.matchAll(/^export\s+(?:async\s+)?(?:function|const|let|var|class)\s+(\w+)/gm)) {
    names.add(name);
  }
  // `export {a, b as c}` — with or without a `from` clause
  for (const [, block] of code.matchAll(/^export\s*\{([^}]*)\}/gm)) {
    for (const entry of block.split(",")) {
      const parts = entry.trim().split(/\s+as\s+/);
      const exported = (parts[1] ?? parts[0]).trim();
      if (exported) names.add(exported);
    }
  }
  return names;
}

/** Every `export {…} from "./other.js"` re-export, as [file, source, names]. */
function reExports(file) {
  const code = readFileSync(file, "utf8");
  return [...code.matchAll(/^export\s*\{([^}]*)\}\s*from\s*["'](\.[^"']*)["']/gm)].map(([, block, source]) => ({
    file,
    source,
    names: block.split(",").map((e) => e.trim().split(/\s+as\s+/)[0].trim()).filter(Boolean)
  }));
}

describe("module export graph", () => {
  test("finds the browser-side modules", () => {
    expect(files.length).toBeGreaterThan(5);
  });

  test("every re-exported name exists in the module it comes from", () => {
    const broken = [];
    for (const file of files) {
      for (const {source, names} of reExports(file)) {
        const target = resolve(dirname(file), source);
        const available = exportsOf(target);
        for (const name of names) {
          if (!available.has(name)) broken.push(`${file}: re-exports '${name}' from ${source}, which does not export it`);
        }
      }
    }
    expect(broken).toEqual([]);
  });

  test("every local import names something the target actually exports", () => {
    const broken = [];
    for (const file of files) {
      const code = readFileSync(file, "utf8");
      for (const [, block, source] of code.matchAll(/^import\s*\{([^}]*)\}\s*from\s*["'](\.[^"']*)["']/gm)) {
        const available = exportsOf(resolve(dirname(file), source));
        for (const entry of block.split(",")) {
          const name = entry.trim().split(/\s+as\s+/)[0].trim();
          if (name && !available.has(name)) broken.push(`${file}: imports '${name}' from ${source}, which does not export it`);
        }
      }
    }
    expect(broken).toEqual([]);
  });
});
