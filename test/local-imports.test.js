// Oblique Equal Earth — an interactive equal-area world map.
// Copyright (C) 2026 Georg Ogris
//
// This program is free software: you can redistribute it and/or modify it
// under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or (at your
// option) any later version. See the LICENSE file, or <https://www.gnu.org/licenses/>.

// Observable Framework refuses any relative import that resolves outside its
// root (`src/`). It is a *client-side* error: `observable build` still exits 0
// and the page only fails once loaded, so nothing else in this suite catches it.
import {readFileSync} from "node:fs";
import {dirname, relative, resolve} from "node:path";
import {describe, expect, test} from "vitest";
import {globSync} from "node:fs";

const SRC = resolve("src");

/**
 * Data loaders (`src/data/*.json.js`) are exempt: Framework runs those in Node
 * at build time, not in the browser, so they may reach into `lib/`. Everything
 * else under src/ is shipped to the browser and must stay inside the root.
 */
const isDataLoader = (file) => /^src\/data\/.+\.[a-z]+\.js$/.test(file);

/** JS sources to scan: .js files, plus the ```js blocks inside .md pages. */
function sources() {
  const files = globSync("src/**/*.{js,md}")
    .filter((f) => !f.includes(".observablehq"))
    .filter((f) => !isDataLoader(f));
  return files.map((file) => {
    const text = readFileSync(file, "utf8");
    if (!file.endsWith(".md")) return {file, code: text};
    const blocks = [...text.matchAll(/```js\n([\s\S]*?)```/g)].map((m) => m[1]);
    return {file, code: blocks.join("\n")};
  });
}

const IMPORT_RE = /^\s*import\s[^"']*["'](\.[^"']*)["']/gm;

describe("Framework import locality", () => {
  test("finds the page and component sources to scan", () => {
    const files = sources().map((s) => s.file);
    expect(files).toContain("src/index.md");
    expect(files).toContain("src/components/map.js");
  });

  test("exempts data loaders, which run in Node and may use lib/", () => {
    expect(sources().map((s) => s.file)).not.toContain("src/data/wiki.json.js");
  });

  test("no relative import escapes src/", () => {
    const escapes = [];
    for (const {file, code} of sources()) {
      for (const [, specifier] of code.matchAll(IMPORT_RE)) {
        const target = resolve(dirname(file), specifier);
        if (relative(SRC, target).startsWith("..")) escapes.push(`${file} -> ${specifier}`);
      }
    }
    expect(escapes).toEqual([]);
  });
});

// `observable build` exits 0 even when a page fails to compile — the failure is
// baked into the emitted HTML and only surfaces in the browser. Scan for it.
describe.skipIf(!(() => { try { readFileSync("dist/index.html"); return true; } catch { return false; } })())(
  "emitted page",
  () => {
    const html = () => readFileSync("dist/index.html", "utf8");

    test("carries no Framework compile error", () => {
      const markers = ["non-local import", "RuntimeError", "SyntaxError", "ReferenceError"];
      expect(markers.filter((m) => html().includes(m))).toEqual([]);
    });

    test("still renders the view picker", () => {
      expect(html()).toContain("view-picker");
    });
  }
);
