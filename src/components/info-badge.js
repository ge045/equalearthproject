// Oblique Equal Earth — an interactive equal-area world map.
// Copyright (C) 2026 Georg Ogris
//
// This program is free software: you can redistribute it and/or modify it
// under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or (at your
// option) any later version. See the LICENSE file, or <https://www.gnu.org/licenses/>.

/**
 * A circled ℹ that reveals its explanation on hover.
 *
 * The bubble is a real element rather than a `title` attribute: native tooltips
 * take about a second to appear, cannot be styled to match the map's palette,
 * and never show on a keyboard focus. Setting both would also produce two
 * tooltips at once.
 *
 * The badge is focusable and carries the text as its aria-label, so the
 * explanation is reachable without a pointer. The bubble and the glyph are
 * hidden from assistive technology to avoid announcing the same text twice.
 */
export function createInfoBadge(text, {align = "right"} = {}) {
  const badge = document.createElement("span");
  badge.className = "eq-badge";
  badge.dataset.align = align;
  badge.tabIndex = 0;
  badge.setAttribute("role", "note");
  badge.setAttribute("aria-label", text);

  const mark = document.createElement("span");
  mark.className = "eq-badge-mark";
  mark.textContent = "ℹ";
  mark.setAttribute("aria-hidden", "true");
  badge.appendChild(mark);

  const bubble = document.createElement("span");
  bubble.className = "eq-bubble";
  bubble.textContent = text;
  bubble.setAttribute("aria-hidden", "true");
  badge.appendChild(bubble);

  return badge;
}
