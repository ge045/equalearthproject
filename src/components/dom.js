// Oblique Equal Earth — an interactive equal-area world map.
// Copyright (C) 2026 Georg Ogris
//
// This program is free software: you can redistribute it and/or modify it
// under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or (at your
// option) any later version. See the LICENSE file, or <https://www.gnu.org/licenses/>.

/**
 * Small DOM helpers that a page cell must not inline.
 *
 * Observable Framework compiles each ```js block on a page into a reactive cell
 * whose free identifiers become function parameters supplied by its runtime.
 * Writing `new Event("input")` inside a cell therefore turns `Event` into an
 * unresolvable input — the cell errors and everything it declares silently
 * never renders. Module code is not compiled that way, so globals used here
 * are the real globals.
 */

/**
 * Set an Observable Inputs value and notify its listeners.
 * @returns true if the value actually changed
 */
export function setInputValue(input, value) {
  // input.value is always a string, so a strict compare against a number never
  // matches and the guard never fires — leaving the map and the slider to echo
  // each other indefinitely.
  if (Number(input.value) === Number(value)) return false;
  input.value = value;
  input.dispatchEvent(new Event("input", {bubbles: true}));
  return true;
}
