// Oblique Equal Earth — an interactive equal-area world map.
// Copyright (C) 2026 Georg Ogris
//
// This program is free software: you can redistribute it and/or modify it
// under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or (at your
// option) any later version. See the LICENSE file, or <https://www.gnu.org/licenses/>.

/**
 * Colour-index hit testing.
 *
 * Canvas keeps no scene graph — once a shape is filled only pixels remain. So
 * the scene is rendered twice: once for people, and once into an offscreen
 * buffer where every feature is filled with a flat colour encoding its index.
 * A hover is then one getImageData() read instead of a point-in-polygon sweep
 * over every country, and it is pixel-exact for whatever the projection drew.
 *
 * Index 0 is reserved for the untouched background, so feature i is drawn as
 * i + 1. Nothing on this buffer is ever stroked or antialiased against another
 * feature: a blended edge would decode to a third, nonexistent index.
 */

export function indexToColor(index) {
  return `#${(index + 1).toString(16).padStart(6, "0")}`;
}

export function colorToIndex(r, g, b) {
  return ((r << 16) | (g << 8) | b) - 1;
}

export class HitTester {
  #context;
  #width;
  #height;
  #features = [];

  constructor(context, width, height) {
    this.#context = context;
    this.#width = width;
    this.#height = height;
  }

  /**
   * @param {Array} features
   * @param {(feature: any) => void} buildPath issues the path commands for one
   *   feature onto this buffer's context (typically a d3.geoPath bound to it)
   */
  render(features, buildPath) {
    this.#features = features;
    const context = this.#context;
    context.clearRect(0, 0, this.#width, this.#height);
    features.forEach((feature, index) => {
      context.beginPath();
      buildPath(feature);
      context.fillStyle = indexToColor(index);
      context.fill();
    });
  }

  /** @returns the feature under (x, y), or null over the background */
  pick(x, y) {
    const [r, g, b] = this.#context.getImageData(x, y, 1, 1).data;
    const index = colorToIndex(r, g, b);
    return this.#features[index] ?? null;
  }
}
