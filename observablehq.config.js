// Oblique Equal Earth — an interactive equal-area world map.
// Copyright (C) 2026 Georg Ogris
//
// This program is free software: you can redistribute it and/or modify it
// under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or (at your
// option) any later version. See the LICENSE file, or <https://www.gnu.org/licenses/>.

export default {
  title: "Oblique Equal Earth",
  // A light/dark pair: Framework switches the page chrome with the reader's
  // prefers-color-scheme, and the map follows the same signal independently.
  theme: ["air", "near-midnight"],
  // No third-party subresources. Framework otherwise injects preconnect,
  // preload and stylesheet links to fonts.googleapis.com / fonts.gstatic.com
  // for Source Serif 4, which sends every visitor's IP address to Google
  // before a single pixel is drawn. Embedders operating under the GDPR cannot
  // ship that (LG München I, 20.01.2022, 3 O 17493/20), and the built page
  // should be safe to deploy without anyone having to post-process it.
  //
  // Nothing is lost visually: Framework's --serif already falls back through
  // Iowan Old Style, Palatino Linotype, Times New Roman and finally the
  // platform serif, all of which are local.
  globalStylesheets: [],
  root: "src",
  toc: false,
  pager: false,
  sidebar: false,
  // AGPL section 13: users interacting with this over a network must be
  // offered its source, so the link is part of the page itself.
  footer:
    'Map data: <a href="https://www.naturalearthdata.com/">Natural Earth</a> (public domain). '
    + 'Free software under the <a href="https://www.gnu.org/licenses/agpl-3.0.html">GNU AGPL v3</a> — '
    + '<a href="https://gitlab.com/georg.ogris/equalearthproject">source code</a>.'
};
