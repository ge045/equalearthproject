// Oblique Equal Earth — an interactive equal-area world map.
// Copyright (C) 2026 Georg Ogris
//
// This program is free software: you can redistribute it and/or modify it
// under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or (at your
// option) any later version. See the LICENSE file, or <https://www.gnu.org/licenses/>.

/**
 * Bundle the map into one ES module any page can load.
 *
 *   node build/embed.js [outDir]
 *
 * Framework resolves browser imports through its own `npm:` protocol, which no
 * other bundler understands, so those specifiers are rewritten to plain package
 * names on the way in.
 */
import {copyFileSync, existsSync, mkdirSync, readdirSync, statSync} from "node:fs";
import {join} from "node:path";
import * as esbuild from "esbuild";

const outDir = process.argv[2] ?? "dist-embed";
const CACHE = "src/.observablehq/cache/data";

/** Rewrite Framework's `npm:foo` specifiers to plain `foo`. */
const npmProtocol = {
  name: "npm-protocol",
  setup(build) {
    build.onResolve({filter: /^npm:/}, (args) => build.resolve(args.path.slice(4), {
      kind: "import-statement",
      resolveDir: args.resolveDir
    }));
  }
};

const result = await esbuild.build({
  entryPoints: ["src/components/embed.js"],
  outfile: join(outDir, "equal-earth.js"),
  bundle: true,
  format: "esm",
  platform: "browser",
  target: "es2022",
  minify: true,
  sourcemap: true,
  metafile: true,
  legalComments: "inline",
  // AGPL: the notice has to survive into the artefact people actually receive.
  // esbuild only preserves comments it recognises as legal ones, so the notice
  // is prepended explicitly rather than relying on the source headers.
  banner: {
    js: [
      "/*! Oblique Equal Earth — an interactive equal-area world map.",
      " * Copyright (C) 2026 Georg Ogris",
      " * Licensed under the GNU Affero General Public License v3 or later.",
      " * Source: https://gitlab.com/georg.ogris/equalearthproject",
      " */"
    ].join("\n")
  },
  plugins: [npmProtocol]
});

const [bundle] = Object.entries(result.metafile.outputs).filter(([f]) => f.endsWith(".js"));
console.log(`${bundle[0]}  ${(bundle[1].bytes / 1024).toFixed(0)} kB`);

// The data is far too large to inline, so it is copied alongside for the host
// to serve; `dataBase` points the element at wherever that ends up.
if (!existsSync(CACHE)) {
  console.error(`\nNo data in ${CACHE} — run \`npm run build\` first.`);
  process.exit(1);
}
const dataOut = join(outDir, "data");
mkdirSync(dataOut, {recursive: true});
let total = 0;
for (const file of readdirSync(CACHE).filter((f) => f.endsWith(".json"))) {
  copyFileSync(join(CACHE, file), join(dataOut, file));
  total += statSync(join(dataOut, file)).size;
}
console.log(`${dataOut}/  ${(total / 1024 / 1024).toFixed(1)} MB of map data`);
