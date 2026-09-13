// Oblique Equal Earth — an interactive equal-area world map.
// Copyright (C) 2026 Georg Ogris
//
// This program is free software: you can redistribute it and/or modify it
// under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or (at your
// option) any later version. See the LICENSE file, or <https://www.gnu.org/licenses/>.

import {describe, expect, test} from "vitest";
import {geoEqualEarth} from "d3-geo";
import {centreOn, freeRotation, normalizeAngle, rollBy, slerpRotation, withRoll} from "../src/components/rotation.js";

const WIDTH = 960, HEIGHT = 500;
const project = (rotation) =>
  geoEqualEarth().scale(170).translate([WIDTH / 2, HEIGHT / 2]).rotate(rotation);

/** Simulate a drag from screen point `from` to `to`, returning the new rotation. */
function drag(rotation, from, to) {
  const proj = project(rotation);
  return freeRotation(rotation, proj.invert(from), proj.invert(to));
}

describe("normalizeAngle", () => {
  test("leaves an in-range angle alone", () => {
    expect(normalizeAngle(90)).toBe(90);
  });

  test("wraps past half a turn into the negative half", () => {
    expect(normalizeAngle(190)).toBeCloseTo(-170, 9);
  });

  test("wraps below half a turn into the positive half", () => {
    expect(normalizeAngle(-190)).toBeCloseTo(170, 9);
  });

  test("wraps a full turn back to zero", () => {
    expect(normalizeAngle(360)).toBeCloseTo(0, 9);
  });
});

describe("freeRotation", () => {
  test("leaves the rotation unchanged when the cursor does not move", () => {
    const result = drag([0, 0, 0], [480, 250], [480, 250]);
    result.forEach((angle) => expect(angle).toBeCloseTo(0, 6));
  });

  // The versor contract: whatever you grabbed stays under the cursor.
  test("keeps the grabbed point under the cursor", () => {
    const start = [20, -35, 10];
    const from = [400, 260], to = [520, 300];
    const grabbed = project(start).invert(from);
    const moved = project(drag(start, from, to))(grabbed);
    expect(moved[0]).toBeCloseTo(to[0], 3);
    expect(moved[1]).toBeCloseTo(to[1], 3);
  });

  // Issue (3): the old pitch clamp pinned rotation at +/-90, so once a pole
  // reached the centre the map would not travel any further.
  test("keeps travelling when a pole sits at the centre", () => {
    const poleCentred = [0, 90, 0]; // south pole at the centre of the map
    const from = [480, 250], to = [480, 340];
    const grabbed = project(poleCentred).invert(from);
    const moved = project(drag(poleCentred, from, to))(grabbed);
    expect(moved[1]).toBeCloseTo(to[1], 3);
  });

  test("carries the view past the pole rather than stopping at it", () => {
    let rotation = [0, 80, 0];
    const before = rotation[1];
    for (let i = 0; i < 6; i++) rotation = drag(rotation, [480, 230], [480, 290]);
    expect(rotation.every(Number.isFinite)).toBe(true);
    expect(rotation[1]).not.toBeCloseTo(before, 1);
  });

  // Issue (1) + the gimbal problem: dragging must follow the cursor even when
  // the map has tumbled upside down.
  test("still follows the cursor with the map upside down", () => {
    const upsideDown = [0, -180, 0];
    const from = [400, 250], to = [500, 250];
    const grabbed = project(upsideDown).invert(from);
    const moved = project(drag(upsideDown, from, to))(grabbed);
    expect(moved[0]).toBeCloseTo(to[0], 3);
  });

  test("returns finite angles for a large drag", () => {
    expect(drag([0, 0, 0], [200, 120], [800, 420]).every(Number.isFinite)).toBe(true);
  });

  test("ignores a drag that starts off the sphere", () => {
    // projection.invert returns null outside the map outline.
    expect(freeRotation([10, 20, 30], null, [0, 0])).toEqual([10, 20, 30]);
  });

  test("ignores a drag that ends off the sphere", () => {
    expect(freeRotation([10, 20, 30], [0, 0], null)).toEqual([10, 20, 30]);
  });
});

describe("rollBy", () => {
  test("spins the map proportionally to horizontal movement", () => {
    expect(rollBy([0, 0, 0], 100, 0.25)[2]).toBeCloseTo(25, 9);
  });

  test("spins the other way for a leftward drag", () => {
    expect(rollBy([0, 0, 0], -100, 0.25)[2]).toBeCloseTo(-25, 9);
  });

  test("accumulates onto the existing roll", () => {
    expect(rollBy([0, 0, 40], 40, 0.25)[2]).toBeCloseTo(50, 9);
  });

  test("leaves yaw and pitch untouched", () => {
    const [yaw, pitch] = rollBy([33, -14, 0], 100, 0.25);
    expect([yaw, pitch]).toEqual([33, -14]);
  });

  test("wraps roll rather than growing without bound", () => {
    expect(Math.abs(rollBy([0, 0, 170], 200, 0.25)[2])).toBeLessThanOrEqual(180);
  });
});

describe("withRoll", () => {
  test("replaces only the roll axis", () => {
    expect(withRoll([10, 20, 0], 90)).toEqual([10, 20, 90]);
  });

  test("wraps a slider value beyond half a turn", () => {
    expect(withRoll([10, 20, 0], 270)[2]).toBeCloseTo(-90, 9);
  });
});

const where = (rotation, lonLat = [0, 0]) => project(rotation)(lonLat);

describe("centreOn", () => {
  test("brings a given lon/lat to the middle of the map", () => {
    const [x, y] = where(centreOn(10, 46), [10, 46]);
    expect(x).toBeCloseTo(WIDTH / 2, 6);
    expect(y).toBeCloseTo(HEIGHT / 2, 6);
  });

  test("centres the south pole", () => {
    const [, y] = where(centreOn(0, -90), [0, -90]);
    expect(y).toBeCloseTo(HEIGHT / 2, 6);
  });

  test("centres the north pole", () => {
    const [, y] = where(centreOn(0, 90), [0, 90]);
    expect(y).toBeCloseTo(HEIGHT / 2, 6);
  });

  test("carries the requested roll through", () => {
    expect(centreOn(10, 46, 180)[2]).toBe(180);
  });

  test("defaults to no roll", () => {
    expect(centreOn(10, 46)[2]).toBe(0);
  });
});

describe("slerpRotation", () => {
  const a = [0, 0, 0];
  const b = [90, -30, 0];

  test("returns the start orientation at t=0", () => {
    const [x, y] = where(slerpRotation(a, b, 0), [20, 10]);
    const [ax, ay] = where(a, [20, 10]);
    expect(x).toBeCloseTo(ax, 6);
    expect(y).toBeCloseTo(ay, 6);
  });

  test("returns the end orientation at t=1", () => {
    const [x, y] = where(slerpRotation(a, b, 1), [20, 10]);
    const [bx, by] = where(b, [20, 10]);
    expect(x).toBeCloseTo(bx, 6);
    expect(y).toBeCloseTo(by, 6);
  });

  test("lands somewhere between the two at t=0.5", () => {
    const mid = where(slerpRotation(a, b, 0.5), [20, 10])[0];
    const [ax, bx] = [where(a, [20, 10])[0], where(b, [20, 10])[0]];
    expect(mid).toBeGreaterThan(Math.min(ax, bx));
    expect(mid).toBeLessThan(Math.max(ax, bx));
  });

  // A spin to 350 degrees should back up 10, not travel 350 the long way.
  test("takes the short way round", () => {
    const mid = slerpRotation([0, 0, 0], [350, 0, 0], 0.5);
    const [x] = where(mid, [0, 0]);
    expect(Math.abs(x - WIDTH / 2)).toBeLessThan(40);
  });

  test("produces finite angles throughout the sweep", () => {
    for (let t = 0; t <= 1.0001; t += 0.1) {
      expect(slerpRotation([0, 0, 0], [180, 80, 120], t).every(Number.isFinite)).toBe(true);
    }
  });

  test("handles identical endpoints without dividing by zero", () => {
    expect(slerpRotation(b, b, 0.5).every(Number.isFinite)).toBe(true);
  });
});
