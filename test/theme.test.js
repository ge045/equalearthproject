// Oblique Equal Earth — an interactive equal-area world map.
// Copyright (C) 2026 Georg Ogris
//
// This program is free software: you can redistribute it and/or modify it
// under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or (at your
// option) any later version. See the LICENSE file, or <https://www.gnu.org/licenses/>.

import {describe, expect, test, vi} from "vitest";
import {resolveTheme, watchTheme} from "../src/components/theme.js";

/** A controllable stand-in for window.matchMedia. */
function fakeMatchMedia(prefersDark) {
  const listeners = new Set();
  const query = {
    matches: prefersDark,
    addEventListener: (_, fn) => listeners.add(fn),
    removeEventListener: (_, fn) => listeners.delete(fn)
  };
  const fn = () => query;
  fn.flipTo = (dark) => {
    query.matches = dark;
    for (const l of [...listeners]) l({matches: dark});
  };
  fn.listenerCount = () => listeners.size;
  return fn;
}

describe("resolveTheme", () => {
  test("honours an explicit light preference", () => {
    expect(resolveTheme("light", fakeMatchMedia(true))).toBe("light");
  });

  test("honours an explicit dark preference", () => {
    expect(resolveTheme("dark", fakeMatchMedia(false))).toBe("dark");
  });

  test("follows the system when set to auto", () => {
    expect(resolveTheme("auto", fakeMatchMedia(true))).toBe("dark");
    expect(resolveTheme("auto", fakeMatchMedia(false))).toBe("light");
  });

  test("treats a missing preference as auto", () => {
    expect(resolveTheme(undefined, fakeMatchMedia(true))).toBe("dark");
  });

  test("treats an unrecognised preference as auto rather than throwing", () => {
    expect(resolveTheme("chartreuse", fakeMatchMedia(true))).toBe("dark");
  });

  // Server-side rendering and the snapshot script have no matchMedia.
  test("falls back to light where matchMedia does not exist", () => {
    expect(resolveTheme("auto", undefined)).toBe("light");
  });
});

describe("watchTheme", () => {
  test("reports a change when the system flips to dark", () => {
    const mm = fakeMatchMedia(false);
    const seen = [];
    watchTheme("auto", (t) => seen.push(t), mm);
    mm.flipTo(true);
    expect(seen).toEqual(["dark"]);
  });

  test("reports a change back to light", () => {
    const mm = fakeMatchMedia(true);
    const seen = [];
    watchTheme("auto", (t) => seen.push(t), mm);
    mm.flipTo(false);
    expect(seen).toEqual(["light"]);
  });

  // An embedder pinning the theme does not want the OS overriding them.
  test("ignores system changes when the theme is pinned", () => {
    const mm = fakeMatchMedia(false);
    const onChange = vi.fn();
    watchTheme("dark", onChange, mm);
    mm.flipTo(true);
    expect(onChange).not.toHaveBeenCalled();
  });

  test("subscribes nothing at all when pinned", () => {
    const mm = fakeMatchMedia(false);
    watchTheme("light", () => {}, mm);
    expect(mm.listenerCount()).toBe(0);
  });

  test("stops reporting once unsubscribed", () => {
    const mm = fakeMatchMedia(false);
    const seen = [];
    const stop = watchTheme("auto", (t) => seen.push(t), mm);
    stop();
    mm.flipTo(true);
    expect(seen).toEqual([]);
  });

  test("returns a callable even when pinned, so callers need not branch", () => {
    expect(() => watchTheme("dark", () => {}, fakeMatchMedia(false))()).not.toThrow();
  });

  test("survives an environment with no matchMedia", () => {
    expect(() => watchTheme("auto", () => {}, undefined)()).not.toThrow();
  });
});
