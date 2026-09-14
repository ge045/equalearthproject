// Oblique Equal Earth — an interactive equal-area world map.
// Copyright (C) 2026 Georg Ogris
//
// This program is free software: you can redistribute it and/or modify it
// under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or (at your
// option) any later version. See the LICENSE file, or <https://www.gnu.org/licenses/>.

/**
 * Entry point for the embeddable bundle.
 *
 * Importing this registers <equal-earth-map>, which is what a host page wants
 * from a single <script type="module"> tag. register() is a no-op without a
 * DOM, so importing it anywhere else is still safe.
 */
export {DEFAULT_ROTATION, STYLES, TAG, mount, parseRotation, register} from "./equal-earth-element.js";
export {VIEW_GROUPS, ALL_VIEWS} from "./views.js";

import {register} from "./equal-earth-element.js";
register();
