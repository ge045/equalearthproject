// Oblique Equal Earth — an interactive equal-area world map.
// Copyright (C) 2026 Georg Ogris
//
// This program is free software: you can redistribute it and/or modify it
// under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or (at your
// option) any later version. See the LICENSE file, or <https://www.gnu.org/licenses/>.

export default {
  title: "Oblique Equal Earth",
  theme: "air",
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
