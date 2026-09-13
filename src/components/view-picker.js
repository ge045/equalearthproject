// Oblique Equal Earth — an interactive equal-area world map.
// Copyright (C) 2026 Georg Ogris
//
// This program is free software: you can redistribute it and/or modify it
// under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or (at your
// option) any later version. See the LICENSE file, or <https://www.gnu.org/licenses/>.

/**
 * Grouped, clickable catalogue of preset orientations.
 *
 * Collapsed <details> per group rather than one flat wall of buttons: there are
 * enough views that a flat list stops being browsable, and the group headings
 * are themselves part of the teaching — they say what kind of question each set
 * of views is there to answer.
 *
 * Each group owns its own explanation panel, sitting directly under that
 * group's buttons. A single shared panel at the foot of the list would drift
 * far away from whatever the reader just clicked, especially once a group near
 * the bottom is open.
 */
import {wikipediaUrl} from "./registry.js";

export function createViewPicker({groups, onSelect}) {
  const container = document.createElement("div");
  container.className = "view-picker";

  const allButtons = [];
  const allPanels = [];

  /** Fill a panel with a view's title, explanation and further reading. */
  function describe(panel, view) {
    panel.textContent = "";

    const heading = document.createElement("strong");
    heading.textContent = view.name;
    panel.appendChild(heading);

    const body = document.createElement("p");
    body.className = "view-explanation";
    body.textContent = view.explanation ?? view.note;
    panel.appendChild(body);

    if (view.wiki) {
      const link = document.createElement("a");
      link.href = wikipediaUrl(view.wiki);
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = `Read about ${view.wiki} on Wikipedia →`;
      panel.appendChild(link);
    }

    panel.hidden = false;
  }

  /** Exactly one view may be pressed, and at most one panel may be open. */
  function select(activeButton, activePanel) {
    for (const button of allButtons) {
      button.setAttribute("aria-pressed", String(button === activeButton));
    }
    for (const panel of allPanels) {
      if (panel !== activePanel) panel.hidden = true;
    }
  }

  groups.forEach((group, index) => {
    const section = document.createElement("details");
    section.open = index === 0; // first group open, so the feature is visible

    const summary = document.createElement("summary");
    summary.innerHTML = `<strong>${group.name}</strong> <span class="view-count">${group.views.length}</span>`;
    section.appendChild(summary);

    const blurb = document.createElement("p");
    blurb.className = "view-blurb";
    blurb.textContent = group.blurb;
    section.appendChild(blurb);

    const row = document.createElement("div");
    row.className = "view-row";
    section.appendChild(row);

    const panel = document.createElement("div");
    panel.className = "view-note";
    panel.hidden = true;
    section.appendChild(panel);
    allPanels.push(panel);

    for (const view of group.views) {
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.view = view.name;
      button.textContent = view.name;
      button.title = view.note;
      button.setAttribute("aria-pressed", "false");
      button.addEventListener("click", () => {
        select(button, panel);
        describe(panel, view);
        onSelect(view);
      });
      allButtons.push(button);
      row.appendChild(button);
    }

    container.appendChild(section);
  });

  /** Drop the pressed state and close every panel — the map matches no preset. */
  container.clearSelection = () => select(null, null);

  return container;
}
