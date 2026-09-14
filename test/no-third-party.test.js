// Oblique Equal Earth — an interactive equal-area world map.
// Copyright (C) 2026 Georg Ogris
//
// This program is free software: you can redistribute it and/or modify it
// under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or (at your
// option) any later version. See the LICENSE file, or <https://www.gnu.org/licenses/>.

/**
 * The built site must make no third-party requests.
 *
 * A subresource — a stylesheet, font, script or image loaded from another
 * origin — sends the visitor's IP address there before the page has rendered,
 * with no consent and no way to decline. German and Austrian courts have
 * treated embedded Google Fonts as exactly that (LG München I, 20.01.2022,
 * 3 O 17493/20), and Framework injects such links by default.
 *
 * A plain <a href> to another site is NOT the same thing and is deliberately
 * allowed: nothing is fetched until the reader chooses to follow it. Wikipedia
 * links, the data attribution and the AGPL source link all stay.
 *
 * Skipped until `npm run build` has run.
 */
import {existsSync, readFileSync, readdirSync, statSync} from "node:fs";
import {extname, join} from "node:path";
import {describe, expect, test} from "vitest";

const DIST = "dist";
const built = existsSync(join(DIST, "index.html"));

function walk(dir) {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

const html = () => readFileSync(join(DIST, "index.html"), "utf8");
const isExternal = (url) => /^(https?:)?\/\//i.test(url);

/** Every attribute that makes the browser fetch something on load. */
const SUBRESOURCE = /<(?:link|script|img|iframe|video|audio|source|embed|object|track)\b[^>]*?\b(?:href|src|data)\s*=\s*["']([^"']+)["'][^>]*>/gi;

describe.skipIf(!built)("built site makes no third-party requests", () => {
  test("loads no subresource from another origin", () => {
    const offenders = [...html().matchAll(SUBRESOURCE)]
      .map((m) => m[1])
      .filter(isExternal);
    expect(offenders).toEqual([]);
  });

  test("names no Google font host anywhere in the page", () => {
    expect(html()).not.toMatch(/fonts\.(googleapis|gstatic)\.com/);
  });

  test("preconnects and prefetches nowhere", () => {
    const hints = [...html().matchAll(/<link\b[^>]*rel\s*=\s*["'](preconnect|dns-prefetch)["'][^>]*>/gi)];
    expect(hints.map((h) => h[0])).toEqual([]);
  });

  test("imports no external stylesheet from the built CSS", () => {
    const offenders = [];
    for (const file of walk(DIST).filter((f) => extname(f) === ".css")) {
      const css = readFileSync(file, "utf8");
      for (const [, url] of css.matchAll(/@import\s+(?:url\()?["']?([^"')\s;]+)/g)) {
        if (isExternal(url)) offenders.push(`${file}: ${url}`);
      }
      for (const [, url] of css.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/g)) {
        if (isExternal(url)) offenders.push(`${file}: ${url}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  // The distinction the whole rule rests on: links the reader may follow are
  // fine, so this asserts they survived rather than being stripped too.
  test("still links out to Wikipedia and the data source for the reader to follow", () => {
    expect(html()).toMatch(/<a[^>]+href="https:\/\/www\.naturalearthdata\.com/);
  });

  test("still carries the AGPL source link the licence requires", () => {
    expect(html()).toMatch(/<a[^>]+href="https:\/\/gitlab\.com/);
  });
});

describe("the embeddable component", () => {
  test("uses only locally available fonts", async () => {
    const {STYLES} = await import("../src/components/equal-earth-element.js");
    expect(STYLES).not.toMatch(/fonts\.(googleapis|gstatic)|@import|url\(\s*https?:/);
  });
});
