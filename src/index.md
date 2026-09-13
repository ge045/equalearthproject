# Oblique Equal Earth

An equal-area world map you re-centre by **rotating the globe**, not by zooming.
It opens upside down on the prime meridian — because north-at-the-top is a
convention about five centuries old, not a property of the planet.

- **Drag** to swing the world under the projection. Whatever you grab stays under the cursor, over the poles and out the other side.
- **⌘-drag** (Ctrl-drag on Windows/Linux) or the slider to spin the map about the viewing axis.
- **Hover** any country *or ocean* for its name, **click** to open its Wikipedia article.
- **Pick a view** below to swing there smoothly, and read why it is worth looking at.

<style>
.view-picker details {
  border-top: 1px solid var(--theme-foreground-faintest, #ddd);
  padding: 0.4rem 0;
}
.view-picker summary { cursor: pointer; padding: 0.25rem 0; }
.view-picker summary strong { font-weight: 600; }
.view-count {
  font-size: 11px; opacity: 0.55; border: 1px solid currentColor;
  border-radius: 999px; padding: 0 0.4em; margin-left: 0.35em;
}
.view-blurb { margin: 0.2rem 0 0.6rem; font-size: 13px; opacity: 0.75; max-width: 62ch; }
.view-row { display: flex; flex-wrap: wrap; gap: 0.35rem; margin-bottom: 0.6rem; }
.view-row button {
  font: inherit; font-size: 12.5px; cursor: pointer;
  padding: 0.25rem 0.6rem; border-radius: 999px;
  border: 1px solid var(--theme-foreground-faintest, #ccc);
  background: var(--theme-background-alt, #f6f6f6);
  color: inherit;
}
.view-row button:hover { border-color: #f39c12; }
.view-row button[aria-pressed="true"] {
  background: #f39c12; border-color: #f39c12; color: #1a1a1a; font-weight: 600;
}
/* One panel per group, sitting inside that group's own section. */
.view-note {
  font-size: 13.5px; margin: 0.1rem 0 0.7rem; max-width: 68ch;
  padding: 0.65rem 0.85rem;
  border-left: 3px solid #f39c12;
  border-radius: 0 4px 4px 0;
  background: var(--theme-background-alt, #f6f6f6);
}
.view-note[hidden] { display: none; }
.view-note strong { display: block; font-size: 15px; margin-bottom: 0.3rem; }
.view-explanation { margin: 0 0 0.5rem; line-height: 1.55; }
.view-note a { font-size: 12.5px; text-decoration: none; border-bottom: 1px solid currentColor; }
.view-note a:hover { color: #f39c12; }
</style>

```js
const countries = await FileAttachment("./data/countries.json").json();
const marine = await FileAttachment("./data/marine.json").json();
const registry = await FileAttachment("./data/wiki.json").json();
```

```js
// Opening view: yaw 0 keeps Greenwich at the centre, roll 180 turns the whole
// map over. North is down.
const INITIAL_ROTATION = [0, 0, 180];
```

```js
// `view()` is Framework's equivalent of a notebook's `viewof`. The input element
// is kept so the map can push gesture-driven roll back into it, and it starts on
// the same roll as the map or the first slider move would snap the map upright.
const rollInput = Inputs.range([-180, 180], {
  label: "Map spin (roll)",
  step: 1,
  value: INITIAL_ROTATION[2]
});
const roll = view(rollInput);
```

```js
import {createMap} from "./components/map.js";
import {createViewPicker} from "./components/view-picker.js";
import {VIEW_GROUPS} from "./components/views.js";
import {setInputValue} from "./components/dom.js";

const map = createMap({
  countries: countries.features,
  marine: marine.features,
  registry,
  initialRotation: INITIAL_ROTATION,
  invalidation,
  // Free rotation changes roll as well as yaw and pitch, so the slider is told
  // about it; otherwise it would snap the map back the next time it is moved.
  // setInputValue lives in a module on purpose — constructing an Event inside a
  // page cell turns `Event` into an unresolvable cell input and the cell dies.
  onRollChange: (value) => setInputValue(rollInput, Math.round(value))
});

const picker = createViewPicker({
  groups: VIEW_GROUPS,
  onSelect: (chosen) => map.transitionTo(chosen.rotation)
});

// Taking hold of the map means it no longer matches whatever preset was chosen.
map.addEventListener("pointerdown", () => picker.clearSelection());

display(map);
display(picker);
```

```js
// Separate cell on purpose: this re-runs when the slider moves and pushes the
// new roll into the existing map, instead of rebuilding it and losing the
// orientation the user dragged to.
map.setRoll(roll);
```

## What you are looking at

The Equal Earth projection is *equal-area* — every country covers screen space in
proportion to its true size, so the Mercator distortion that inflates the high
latitudes is gone. Because `d3.geoEqualEarth().rotate()` transforms spherical
coordinates **before** projecting, rotating produces a genuinely **oblique**
Equal Earth rather than a panned one: the projection's zero-distortion line moves
with you, so whichever region you swing to the centre is drawn most faithfully.
Watch the graticule — when the parallels stop being horizontal lines, you are
looking at an oblique aspect.

Dragging composes quaternions rather than adding degrees to Euler angles. That is
what lets the map travel past a pole instead of jamming against it, keeps
horizontal dragging following the cursor even when the world is upside down, and
lets a jump between preset views sweep the short arc in orientation space.
