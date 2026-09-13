// Oblique Equal Earth — an interactive equal-area world map.
// Copyright (C) 2026 Georg Ogris
//
// This program is free software: you can redistribute it and/or modify it
// under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or (at your
// option) any later version. See the LICENSE file, or <https://www.gnu.org/licenses/>.

import {defineConfig} from "vitest/config";

export default defineConfig({
  resolve: {
    // Observable Framework resolves browser imports via the `npm:` protocol;
    // map them onto the real installed packages so the same source files can be
    // unit-tested in Node without a second set of import specifiers.
    alias: {
      "npm:d3": "d3",
      "npm:topojson-client": "topojson-client",
      "npm:versor": "versor"
    }
  },
  test: {
    include: ["test/**/*.test.js"],
    environment: "node"
  }
});
