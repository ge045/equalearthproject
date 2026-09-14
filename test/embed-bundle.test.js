// Oblique Equal Earth — an interactive equal-area world map.
// Copyright (C) 2026 Georg Ogris
//
// This program is free software: you can redistribute it and/or modify it
// under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or (at your
// option) any later version. See the LICENSE file, or <https://www.gnu.org/licenses/>.

/**
 * Checks the artefact an embedder actually downloads.
 *
 * The bundle is loaded in a *separate Node process*: importing it from inside
 * vitest goes through Vite's module runner, which resolves and rewrites imports
 * itself and would therefore pass on a bundle no browser could load.
 *
 * Skipped until `npm run build:embed` has run.
 */
import {execFileSync} from "node:child_process";
import {copyFileSync, existsSync, mkdtempSync, readFileSync, rmSync, statSync} from "node:fs";
import {tmpdir} from "node:os";
import {join, resolve} from "node:path";
import {pathToFileURL} from "node:url";
import {describe, expect, test} from "vitest";

const BUNDLE = "dist-embed/equal-earth.js";
const built = existsSync(BUNDLE);
const source = () => readFileSync(BUNDLE, "utf8");

function inRealNode(script) {
  return execFileSync(process.execPath, ["--input-type=module", "-e", script], {encoding: "utf8"}).trim();
}

describe.skipIf(!built)("embeddable bundle", () => {
  test("is a single self-contained file", () => {
    expect(statSync(BUNDLE).size).toBeGreaterThan(1000);
  });

  test("stays small enough to be worth shipping", () => {
    expect(statSync(BUNDLE).size).toBeLessThan(400 * 1024);
  });

  // Framework's npm: protocol is understood by nothing else. Any left in the
  // bundle means an unresolved import and a page that will not load.
  test("leaves no Framework npm: specifiers behind", () => {
    expect(source()).not.toMatch(/from"npm:|from "npm:|import\("npm:/);
  });

  // Loading it from a directory with no node_modules above it: any dependency
  // left unbundled would fail to resolve there. Scanning the text for import
  // statements cannot do this honestly — the prose in the view catalogue
  // contains the word "import".
  test("is self-contained, with every dependency bundled in", () => {
    const tmp = mkdtempSync(join(tmpdir(), "eq-embed-"));
    const copy = join(tmp, "equal-earth.js");
    copyFileSync(BUNDLE, copy);
    try {
      expect(inRealNode(
        `import(${JSON.stringify(copy)}).then(() => console.log("ok"), e => console.log("FAILED: " + e.message))`
      )).toBe("ok");
    } finally {
      rmSync(tmp, {recursive: true, force: true});
    }
  });

  test("loads in a plain module environment without a DOM", () => {
    expect(inRealNode(
      `import(${JSON.stringify(process.cwd() + "/" + BUNDLE)})
         .then(() => console.log("ok"), (e) => { console.log("FAILED: " + e.message); })`
    )).toBe("ok");
  });

  test("exports the documented entry points", () => {
    expect(inRealNode(
      `import(${JSON.stringify(process.cwd() + "/" + BUNDLE)})
         .then(m => console.log(["mount","register","TAG","STYLES"].filter(k => !(k in m)).join(",") || "all"))`
    )).toBe("all");
  });

  test("registers nothing when loaded without a DOM, rather than throwing", () => {
    expect(inRealNode(
      `import(${JSON.stringify(process.cwd() + "/" + BUNDLE)})
         .then(m => console.log(String(m.register())))`
    )).toBe("false");
  });

  test("carries its licence notice into the built artefact", () => {
    expect(source()).toContain("Affero");
  });

  // The whole embedding story, against the artefact an embedder downloads:
  // load the bundle, register the element, let it fetch its own data, and check
  // it rendered into a shadow root.
  test("a host page can drop in the script tag and the element just works", async () => {
    const {JSDOM} = await import("jsdom");
    const dom = new JSDOM("<!doctype html><html><body></body></html>", {pretendToBeVisual: true});
    const {window} = dom;

    window.HTMLCanvasElement.prototype.getContext = () => ({
      fillStyle: null, strokeStyle: null, lineWidth: 1,
      scale() {}, clearRect() {}, beginPath() {}, closePath() {},
      moveTo() {}, lineTo() {}, arc() {}, fill() {}, stroke() {},
      getImageData: () => ({data: Uint8ClampedArray.from([0, 0, 0, 255])})
    });
    window.matchMedia = () => ({matches: true, addEventListener() {}, removeEventListener() {}});
    window.fetch = async (url) => ({
      ok: true, status: 200,
      json: async () => JSON.parse(readFileSync(
        `dist-embed/data/${String(url).split("/").pop()}`, "utf8"))
    });

    const globals = ["document", "HTMLElement", "customElements", "matchMedia", "fetch",
                     "requestAnimationFrame", "cancelAnimationFrame", "Event", "MouseEvent"];
    const saved = Object.fromEntries(globals.map((k) => [k, globalThis[k]]));
    for (const k of globals) globalThis[k] = window[k]?.bind?.(window) ?? window[k];
    globalThis.window = window;

    try {
      const bundle = await import(pathToFileURL(resolve(BUNDLE)).href);
      expect(bundle.register()).toBe(true);
      const el = window.document.createElement(bundle.TAG);
      el.setAttribute("data-base", "/equal-earth-data");
      window.document.body.appendChild(el);
      await el.ready;

      expect(el.shadowRoot.querySelector("canvas"), "canvas").toBeTruthy();
      expect(el.shadowRoot.querySelector(".view-picker"), "picker").toBeTruthy();
      expect(el.getTheme(), "follows the system dark preference").toBe("dark");
    } finally {
      for (const k of globals) globalThis[k] = saved[k];
      delete globalThis.window;
      dom.window.close();
    }
  });

  test("ships the data the element fetches by default", () => {
    for (const f of ["countries.json", "marine.json", "wiki.json"]) {
      expect(existsSync(`dist-embed/data/${f}`), f).toBe(true);
    }
  });
});
