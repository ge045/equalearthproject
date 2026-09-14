// Oblique Equal Earth — an interactive equal-area world map.
// Copyright (C) 2026 Georg Ogris
//
// This program is free software: you can redistribute it and/or modify it
// under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or (at your
// option) any later version. See the LICENSE file, or <https://www.gnu.org/licenses/>.

/**
 * Angle helpers with no quaternion dependency, so modules that only need to
 * describe an orientation (the view catalogue, build-time scripts) do not have
 * to pull in versor.
 */

/** Wrap an angle into (-180, 180]. */
export function normalizeAngle(degrees) {
  const wrapped = ((degrees + 180) % 360 + 360) % 360 - 180;
  return wrapped === -180 ? 180 : wrapped;
}

/**
 * Rotation that brings a geographic point to the centre of the map.
 * Rotation angles are the negation of the coordinates you want centred, which
 * is easy to get backwards — hence this helper, so view definitions can be
 * written as the place you mean.
 */
export function centreOn(lon, lat, roll = 0) {
  return [-lon, -lat, roll];
}

/**
 * Clamp a pitch to the range versor's Euler conversion can represent.
 *
 * Dragging never needs this — quaternion composition has no pole to jam
 * against — but a slider or an API caller can ask for a pitch of 140, which
 * versor would immediately report back as something else. Clamping keeps a
 * control and the map showing the same number.
 */
export function clampPitch(pitch) {
  return Math.max(-90, Math.min(90, pitch));
}
