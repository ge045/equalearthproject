// Oblique Equal Earth — an interactive equal-area world map.
// Copyright (C) 2026 Georg Ogris
//
// This program is free software: you can redistribute it and/or modify it
// under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or (at your
// option) any later version. See the LICENSE file, or <https://www.gnu.org/licenses/>.

import versor from "npm:versor";
import {normalizeAngle} from "./angles.js";

export {centreOn, normalizeAngle} from "./angles.js";

/**
 * Rotation state for the oblique Equal Earth map.
 *
 * d3.geoEqualEarth().rotate([yaw, pitch, roll]) rotates spherical coordinates
 * *before* projecting, which is what makes the projection oblique — and why
 * this map re-centres by rotating rather than panning or zooming.
 *
 * Dragging is quaternion-based rather than an Euler-angle increment. Adding
 * degrees to [yaw, pitch, roll] gimbal-locks: pitch has to be clamped at the
 * poles (so the map stops travelling once a pole reaches the centre), and past
 * +/-90 the yaw axis inverts so horizontal dragging runs backwards. Composing
 * rotations as quaternions has neither problem, and pins whatever point you
 * grabbed under the cursor at any orientation.
 */

/** Degrees of roll per pixel of modifier-drag. */
export const DEFAULT_SENSITIVITY = 0.25;

/**
 * Rotation that carries `from` to `to`, composed onto `start`.
 *
 * @param {[number, number, number]} start current [yaw, pitch, roll]
 * @param {[number, number]|null} from spherical coords grabbed at drag start,
 *   i.e. projection.invert() of the cursor — null outside the sphere outline
 * @param {[number, number]|null} to spherical coords under the cursor now,
 *   inverted through the *same* starting rotation
 */
export function freeRotation(start, from, to) {
  if (!from || !to) return start; // cursor left the globe; hold the rotation
  const q = versor.multiply(
    versor(start),
    versor.delta(versor.cartesian(from), versor.cartesian(to))
  );
  return versor.rotation(q);
}

/** Spin the map about the viewing axis — the modifier-drag gesture. */
export function rollBy([yaw, pitch, roll], dx, sensitivity = DEFAULT_SENSITIVITY) {
  return [yaw, pitch, normalizeAngle(roll + dx * sensitivity)];
}

/** Set roll outright — the slider. */
export function withRoll([yaw, pitch], roll) {
  return [yaw, pitch, normalizeAngle(roll)];
}

/** Quaternion dot product. */
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];

/**
 * Spherical linear interpolation between two orientations.
 *
 * Interpolating the Euler angles directly would swing the map along a strange
 * path and can travel the long way round a wrap boundary. Slerping the
 * quaternions sweeps the short great-circle arc in orientation space, which is
 * what makes a jump between preset views read as one smooth turn of the globe.
 */
export function slerpRotation(from, to, t) {
  const q0 = versor(from);
  let q1 = versor(to);

  // Quaternions q and -q are the same orientation; pick the nearer one so the
  // sweep takes the short way round.
  let cos = dot(q0, q1);
  if (cos < 0) {
    q1 = q1.map((v) => -v);
    cos = -cos;
  }

  // Nearly coincident: lerp instead, to avoid dividing by a vanishing sine.
  if (cos > 0.9995) {
    const q = q0.map((v, i) => v + (q1[i] - v) * t);
    const norm = Math.hypot(...q);
    return versor.rotation(q.map((v) => v / norm));
  }

  const theta = Math.acos(Math.min(1, cos));
  const sin = Math.sin(theta);
  const w0 = Math.sin((1 - t) * theta) / sin;
  const w1 = Math.sin(t * theta) / sin;
  return versor.rotation(q0.map((v, i) => v * w0 + q1[i] * w1));
}
