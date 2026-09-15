// Oblique Equal Earth — an interactive equal-area world map.
// Copyright (C) 2026 Georg Ogris
//
// This program is free software: you can redistribute it and/or modify it
// under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or (at your
// option) any later version. See the LICENSE file, or <https://www.gnu.org/licenses/>.

/**
 * AGPL section 13: anyone interacting with this over a network must be offered
 * its source. The offer is only worth something if the URL it names is one the
 * reader can actually open — a link to a repository that answers 403 satisfies
 * the letter of nothing.
 *
 * `no-third-party.test.js` already asserts the footer link *survives* the
 * build. This file asserts it points somewhere public, and that every other
 * place the project promises source — the embed bundle's banner, package.json —
 * agrees with it. Those are three separate promises to three different
 * audiences (readers, embedders, packagers) and they drifted apart once.
 *
 * Source-level, so it runs without a build.
 */
import {readFileSync} from "node:fs";
import {describe, expect, test} from "vitest";

/**
 * The public home of this project. Reachability cannot be asserted offline, so
 * the test pins the URL instead: change it here, deliberately, and the three
 * call sites below are forced to follow.
 */
const CANONICAL = "https://github.com/ge045/equalearthproject";

/** Hosts this project has published source from, that are no longer public. */
const RETIRED_HOSTS = [/gitlab\.com/];

const read = (path) => readFileSync(path, "utf8");
const pkg = JSON.parse(read("package.json"));

describe("the AGPL source offer", () => {
  test("the page footer names the public repository", async () => {
    const {default: config} = await import("../observablehq.config.js");
    expect(config.footer).toContain(`href="${CANONICAL}"`);
  });

  test("the embed bundle's banner names the public repository", () => {
    expect(read("build/embed.js")).toContain(`Source: ${CANONICAL}`);
  });

  test("package.json points at the public repository", () => {
    expect(pkg.repository.url).toBe(`git+${CANONICAL}.git`);
    expect(pkg.homepage).toBe(CANONICAL);
  });

  test("no source offer still names a retired host", () => {
    const files = ["observablehq.config.js", "build/embed.js", "package.json", "README.md"];
    const offenders = [];
    for (const file of files) {
      const text = read(file);
      for (const host of RETIRED_HOSTS) {
        if (host.test(text)) offenders.push(`${file}: ${host}`);
      }
    }
    expect(offenders).toEqual([]);
  });
});
