// Oblique Equal Earth — an interactive equal-area world map.
// Copyright (C) 2026 Georg Ogris
//
// This program is free software: you can redistribute it and/or modify it
// under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or (at your
// option) any later version. See the LICENSE file, or <https://www.gnu.org/licenses/>.

/**
 * Framework compiles each ```js block in a page into a reactive cell whose free
 * identifiers become function *parameters*, supplied by its runtime. A browser
 * global used in a cell — `Event`, `window`, `document`, `localStorage` — is
 * therefore not the global at all: it becomes an unresolvable input, the cell
 * errors, and everything it declares silently never renders.
 *
 * `observable build` exits 0 regardless, so scan the compiled graph instead.
 * Code inside src/components/*.js is NOT compiled this way and may use globals
 * freely; this only applies to the page.
 */
import {execFileSync} from "node:child_process";
import {existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {describe, expect, test} from "vitest";

const PAGE = "dist/index.html";

/** Names Framework's runtime injects into cells. Extend if a cell needs more. */
const PROVIDED = new Set([
  "FileAttachment", "Generators", "Mutable", "resize", "registerFile",
  "display", "view", "invalidation", "Inputs", "width", "dark",
  "d3", "html", "svg", "md", "Plot", "DOM", "now", "sql", "echarts"
]);

function cells() {
  const html = readFileSync(PAGE, "utf8");
  // `inputs:` and `outputs:` are each optional and their order is not fixed, so
  // parse the header of every define({...}) rather than one rigid pattern.
  return [...html.matchAll(/define\(\{id:\s*"[^"]*"([^\n]*?)body:/g)].map(([, header]) => {
    const list = (key) => {
      const found = header.match(new RegExp(`${key}:\\s*(\\[[^\\]]*\\])`));
      return found ? JSON.parse(found[1]) : [];
    };
    return {inputs: list("inputs"), outputs: list("outputs")};
  });
}

describe.skipIf(!existsSync(PAGE))("compiled page cells", () => {
  // The page is deliberately thin: it loads data and mounts the component.
  test("finds the page's reactive cells", () => {
    expect(cells().length).toBeGreaterThanOrEqual(2);
  });

  test("every cell input is either declared by another cell or provided by Framework", () => {
    const all = cells();
    const declared = new Set(all.flatMap((c) => c.outputs));
    const unresolved = [...new Set(all.flatMap((c) => c.inputs))]
      .filter((name) => !declared.has(name) && !PROVIDED.has(name));
    expect(unresolved).toEqual([]);
  });
});

/**
 * A documentation fence that Framework decides to *run* is a live cell. When
 * such a cell emits HTML containing a literal `</script>`, that string closes
 * the page's own inline module early and the browser reports
 * "Unexpected end of input" — while `observable build` exits 0 and every cell
 * input still resolves. Use ```html run=false for samples.
 */
describe.skipIf(!existsSync(PAGE))("built page integrity", () => {
  const html = () => readFileSync(PAGE, "utf8");

  test("the inline module is valid JavaScript", () => {
    const blocks = [...html().matchAll(/<script type="module">([\s\S]*?)<\/script>/g)].map((m) => m[1]);
    expect(blocks.length).toBeGreaterThan(0);
    const dir = mkdtempSync(join(tmpdir(), "eq-page-"));
    try {
      blocks.forEach((code, i) => {
        const file = join(dir, `block${i}.mjs`);
        writeFileSync(file, code);
        expect(() => execFileSync(process.execPath, ["--check", file], {stdio: "pipe"}),
          `inline script block ${i} does not parse`).not.toThrow();
      });
    } finally {
      rmSync(dir, {recursive: true, force: true});
    }
  });

  test("no code block leaked a closing script tag into the page's own module", () => {
    const inline = html().split('<script type="module">')[1] ?? "";
    const body = inline.split("</scr" + "ipt>")[0];
    expect(body).not.toContain("</scr" + "ipt>");
  });

  test("every same-origin subresource it references actually exists", () => {
    const refs = [...html().matchAll(/<(?:link|script|img)\b[^>]*?\b(?:href|src)\s*=\s*["']([^"']+)["']/g)]
      .map((m) => m[1])
      .filter((u) => !/^(https?:)?\/\//.test(u) && !u.startsWith("data:") && !u.startsWith("#"));
    const missing = refs.filter((u) => !existsSync(join("dist", u.replace(/^\.?\//, "").split("?")[0])));
    expect(missing).toEqual([]);
  });
});
