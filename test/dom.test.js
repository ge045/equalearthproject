// @vitest-environment jsdom
// Oblique Equal Earth — an interactive equal-area world map.
// Copyright (C) 2026 Georg Ogris
//
// This program is free software: you can redistribute it and/or modify it
// under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or (at your
// option) any later version. See the LICENSE file, or <https://www.gnu.org/licenses/>.

import {describe, expect, test, vi} from "vitest";
import {setInputValue} from "../src/components/dom.js";

const range = (value) => {
  const input = document.createElement("input");
  input.type = "range";
  input.value = String(value);
  return input;
};

describe("setInputValue", () => {
  test("writes the new value onto the input", () => {
    const input = range(0);
    setInputValue(input, 90);
    expect(input.value).toBe("90");
  });

  test("notifies listeners so a reactive cell re-runs", () => {
    const input = range(0);
    const heard = vi.fn();
    input.addEventListener("input", heard);
    setInputValue(input, 90);
    expect(heard).toHaveBeenCalledTimes(1);
  });

  test("reports that it changed the value", () => {
    expect(setInputValue(range(0), 90)).toBe(true);
  });

  // Without this the map's roll notification and the slider echo each other.
  test("does nothing when the value already matches", () => {
    const input = range(90);
    const heard = vi.fn();
    input.addEventListener("input", heard);
    expect(setInputValue(input, 90)).toBe(false);
    expect(heard).not.toHaveBeenCalled();
  });

  test("compares loosely, since input.value is always a string", () => {
    expect(setInputValue(range(90), 90)).toBe(false);
  });
});
