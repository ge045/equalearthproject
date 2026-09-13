// Oblique Equal Earth — an interactive equal-area world map.
// Copyright (C) 2026 Georg Ogris
//
// This program is free software: you can redistribute it and/or modify it
// under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or (at your
// option) any later version. See the LICENSE file, or <https://www.gnu.org/licenses/>.

/**
 * Light/dark resolution.
 *
 * A preference is "auto", "light" or "dark". "auto" follows the reader's
 * operating system and keeps following it; the other two pin the map, which is
 * what an embedder needs when the surrounding page is always one or the other.
 *
 * `matchMedia` is injected so this is testable, and so the headless snapshot
 * script and any server-side use degrade to light rather than crashing.
 */

const DARK_QUERY = "(prefers-color-scheme: dark)";
const noop = () => {};

const systemPrefersDark = (matchMedia) => {
  try {
    return Boolean(matchMedia?.(DARK_QUERY)?.matches);
  } catch {
    return false;
  }
};

/** @returns {"light"|"dark"} */
export function resolveTheme(preference, matchMedia = globalThis.matchMedia) {
  if (preference === "light" || preference === "dark") return preference;
  return systemPrefersDark(matchMedia) ? "dark" : "light";
}

/**
 * Call `onChange(theme)` whenever the system preference flips.
 * Does nothing when the theme is pinned. Always returns an unsubscribe function
 * so callers never have to branch on whether a subscription happened.
 */
export function watchTheme(preference, onChange, matchMedia = globalThis.matchMedia) {
  if (preference === "light" || preference === "dark") return noop;

  const query = (() => {
    try {
      return matchMedia?.(DARK_QUERY);
    } catch {
      return null;
    }
  })();
  if (!query?.addEventListener) return noop;

  const listener = (event) => onChange(event.matches ? "dark" : "light");
  query.addEventListener("change", listener);
  return () => query.removeEventListener("change", listener);
}
