// @vitest-environment jsdom
// Oblique Equal Earth — an interactive equal-area world map.
// Copyright (C) 2026 Georg Ogris
//
// This program is free software: you can redistribute it and/or modify it
// under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or (at your
// option) any later version. See the LICENSE file, or <https://www.gnu.org/licenses/>.

import {describe, expect, test, vi} from "vitest";
import {createViewPicker} from "../src/components/view-picker.js";

const GROUPS = [
  {
    name: "The poles",
    blurb: "The two regions every rectangular world map lies about most.",
    views: [
      {name: "North Pole", rotation: [0, -90, 0], note: "An ocean ringed by continents.",
       explanation: "The Arctic is water. Most of the white at the top of a normal map is floating sea ice. From above you can see the ring of land around it.",
       wiki: "Arctic"},
      {name: "South Pole", rotation: [0, 90, 0], note: "A continent ringed by ocean.",
       explanation: "The south polar region is the mirror image of the north. Here there is real rock and real ice sheet. Around it there is open water all the way round.",
       wiki: "Antarctica"}
    ]
  },
  {
    name: "Ocean basins",
    blurb: "One connected world ocean, conventionally divided into five.",
    views: [{name: "Pacific Ocean", rotation: [160, 0, 0], note: "Big enough to hold every continent.",
             explanation: "The Pacific covers about a third of the Earth's surface. Every continent would fit inside it. Magellan's crew gave it its misleading name.",
             wiki: "Pacific Ocean"}]
  }
];

const picker = (onSelect = () => {}) => createViewPicker({groups: GROUPS, onSelect});
const buttons = (el) => [...el.querySelectorAll("button[data-view]")];
const sections = (el) => [...el.querySelectorAll("details")];
const noteIn = (section) => section.querySelector(".view-note");
const visibleNotes = (el) => [...el.querySelectorAll(".view-note")].filter((n) => !n.hidden);

describe("createViewPicker", () => {
  test("renders one collapsible section per group", () => {
    expect(sections(picker())).toHaveLength(2);
  });

  test("labels each section with its group name", () => {
    const summaries = [...picker().querySelectorAll("summary")].map((s) => s.textContent);
    expect(summaries.some((t) => t.includes("The poles"))).toBe(true);
    expect(summaries.some((t) => t.includes("Ocean basins"))).toBe(true);
  });

  test("shows how many views each group holds", () => {
    expect(picker().querySelector("summary").textContent).toContain("2");
  });

  test("opens the first group so the feature is discoverable", () => {
    const open = sections(picker()).map((s) => s.open);
    expect(open).toEqual([true, false]);
  });

  test("shows each group's blurb", () => {
    expect(picker().textContent).toContain("conventionally divided into five");
  });

  test("renders a button for every view", () => {
    expect(buttons(picker()).map((b) => b.textContent))
      .toEqual(["North Pole", "South Pole", "Pacific Ocean"]);
  });

  test("hands the whole view to onSelect when a button is clicked", () => {
    const onSelect = vi.fn();
    const el = picker(onSelect);
    buttons(el)[1].click();
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({name: "South Pole"}));
  });

  test("exposes each view's note as a tooltip before it is clicked", () => {
    expect(buttons(picker())[0].title).toContain("An ocean ringed by continents");
  });
});

describe("the explanation panel", () => {
  test("gives every group its own panel", () => {
    expect(sections(picker()).every((s) => noteIn(s))).toBe(true);
  });

  test("keeps every panel hidden until something is chosen", () => {
    expect(visibleNotes(picker())).toEqual([]);
  });

  // The panel belongs to the group whose view was picked, so the reader does
  // not have to look away from the buttons they just used.
  test("shows the explanation inside the chosen view's own group", () => {
    const el = picker();
    buttons(el)[0].click();
    const panel = noteIn(sections(el)[0]);
    expect(panel.hidden).toBe(false);
    expect(panel.textContent).toContain("floating sea ice");
  });

  test("leaves other groups' panels hidden", () => {
    const el = picker();
    buttons(el)[0].click();
    expect(noteIn(sections(el)[1]).hidden).toBe(true);
  });

  test("shows the explanation in the second group when a view there is chosen", () => {
    const el = picker();
    buttons(el)[2].click();
    const panel = noteIn(sections(el)[1]);
    expect(panel.hidden).toBe(false);
    expect(panel.textContent).toContain("about a third of the Earth");
  });

  test("moves the panel when the choice moves to another group", () => {
    const el = picker();
    buttons(el)[0].click();
    buttons(el)[2].click();
    expect(visibleNotes(el)).toHaveLength(1);
    expect(noteIn(sections(el)[0]).hidden).toBe(true);
  });

  test("never shows two panels at once", () => {
    const el = picker();
    for (const button of buttons(el)) {
      button.click();
      expect(visibleNotes(el)).toHaveLength(1);
    }
  });

  test("names the selected view alongside its explanation", () => {
    const el = picker();
    buttons(el)[0].click();
    expect(noteIn(sections(el)[0]).textContent).toContain("North Pole");
  });

  test("replaces the previous explanation rather than appending", () => {
    const el = picker();
    buttons(el)[0].click();
    buttons(el)[1].click();
    expect(noteIn(sections(el)[0]).textContent).not.toContain("floating sea ice");
  });

  test("hides every panel when the map is rotated by hand", () => {
    const el = picker();
    buttons(el)[0].click();
    el.clearSelection();
    expect(visibleNotes(el)).toEqual([]);
  });
});

describe("further reading", () => {
  test("offers a Wikipedia link for the selected view", () => {
    const el = picker();
    buttons(el)[1].click();
    expect(noteIn(sections(el)[0]).querySelector("a").href)
      .toBe("https://en.wikipedia.org/wiki/Antarctica");
  });

  test("underscores multi-word article titles", () => {
    const el = picker();
    buttons(el)[2].click();
    expect(noteIn(sections(el)[1]).querySelector("a").href)
      .toBe("https://en.wikipedia.org/wiki/Pacific_Ocean");
  });

  test("opens the article in a new tab without leaking the opener", () => {
    const el = picker();
    buttons(el)[0].click();
    const link = noteIn(sections(el)[0]).querySelector("a");
    expect(link.target).toBe("_blank");
    expect(link.rel).toContain("noopener");
  });
});

describe("pressed state", () => {
  test("marks the selected view as pressed", () => {
    const el = picker();
    buttons(el)[2].click();
    expect(buttons(el).map((b) => b.getAttribute("aria-pressed"))).toEqual(["false", "false", "true"]);
  });

  test("moves the pressed state when another view is chosen", () => {
    const el = picker();
    buttons(el)[2].click();
    buttons(el)[0].click();
    expect(buttons(el).map((b) => b.getAttribute("aria-pressed"))).toEqual(["true", "false", "false"]);
  });

  test("clears the pressed state when the map is rotated by hand", () => {
    const el = picker();
    buttons(el)[0].click();
    el.clearSelection();
    expect(buttons(el).every((b) => b.getAttribute("aria-pressed") === "false")).toBe(true);
  });
});
