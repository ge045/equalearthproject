// Oblique Equal Earth — an interactive equal-area world map.
// Copyright (C) 2026 Georg Ogris
//
// This program is free software: you can redistribute it and/or modify it
// under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or (at your
// option) any later version. See the LICENSE file, or <https://www.gnu.org/licenses/>.

/**
 * Whether the reader has asked for reduced motion.
 *
 * The map opens by turning the globe from the familiar view into its actual
 * starting orientation. That is a large, unrequested movement across most of
 * the screen — exactly what prefers-reduced-motion exists to suppress, and a
 * genuine trigger for people with vestibular disorders. When it is set the map
 * simply starts where it means to end.
 *
 * matchMedia is injected so this is testable and so a DOM-free environment
 * answers "no preference" rather than throwing.
 */
export function prefersReducedMotion(matchMedia = globalThis.matchMedia) {
  try {
    return Boolean(matchMedia?.("(prefers-reduced-motion: reduce)")?.matches);
  } catch {
    return false;
  }
}
