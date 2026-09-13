// Oblique Equal Earth — an interactive equal-area world map.
// Copyright (C) 2026 Georg Ogris
//
// This program is free software: you can redistribute it and/or modify it
// under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or (at your
// option) any later version. See the LICENSE file, or <https://www.gnu.org/licenses/>.

/**
 * Link every browser module under real ESM semantics.
 *
 * Vite/esbuild rewrites imports without verifying them, so a stale re-export or
 * a renamed export passes the whole unit suite and fails only in the browser:
 *
 *   SyntaxError: The requested module './scene.js' does not provide an export
 *   named 'shadeForElevation'
 *
 * Node enforces exactly what a browser enforces, so the modules are copied to a
 * scratch directory with Framework's `npm:` specifiers rewritten to plain ones
 * and imported for real. Anything that would not link in a browser throws here.
 */
import {execFileSync} from "node:child_process";
import {globSync, mkdirSync, readFileSync, rmSync, writeFileSync} from "node:fs";
import {basename, join, resolve} from "node:path";
import {afterAll, beforeAll, describe, expect, test} from "vitest";

// Inside the project so Node resolves real packages by walking up to node_modules.
const SCRATCH = resolve(".tmp-link");
const sources = globSync("src/components/*.js");

beforeAll(() => {
  rmSync(SCRATCH, {recursive: true, force: true});
  mkdirSync(SCRATCH, {recursive: true});
  writeFileSync(join(SCRATCH, "package.json"), JSON.stringify({type: "module"}));
  for (const file of sources) {
    const code = readFileSync(file, "utf8").replace(/["']npm:([^"']+)["']/g, (_, pkg) => JSON.stringify(pkg));
    writeFileSync(join(SCRATCH, basename(file)), code);
  }
});

afterAll(() => rmSync(SCRATCH, {recursive: true, force: true}));

/**
 * Import in a *separate Node process*. Calling import() from inside the test
 * would go through Vite's module runner — the very thing that does not enforce
 * re-exports — and the check would silently pass on broken code.
 */
function linkInRealNode(name) {
  const script = `import(${JSON.stringify(join(SCRATCH, name))}).then(() => {}, (e) => { console.error(e.message); process.exit(1); })`;
  try {
    execFileSync(process.execPath, ["--input-type=module", "-e", script], {stdio: ["ignore", "ignore", "pipe"]});
    return null;
  } catch (error) {
    return String(error.stderr ?? error.message).trim();
  }
}

describe("browser modules link", () => {
  test("there are modules to check", () => {
    expect(sources.length).toBeGreaterThan(5);
  });

  test.each(sources.map((f) => basename(f)))("%s links cleanly", (name) => {
    expect(linkInRealNode(name)).toBeNull();
  });
});
