# Oblique Equal Earth

An equal-area world map you re-centre by **rotating the globe**, not by zooming.
It opens upside down on the prime meridian — because north-at-the-top is a
convention about five centuries old, not a property of the planet.

- **Drag** to swing the world under the projection — whatever you grab stays under the cursor, and you can carry it right over a pole and out the other side.
- **⌘-drag** (Ctrl-drag on Windows/Linux) or the spin slider to roll the map about the viewing axis.
- **Hover** any country *or ocean* for its name, **click** to open its Wikipedia article.
- **Pick a view** below to swing there smoothly, and read why it is worth looking at.
- **Light or dark** follows your system by default; the buttons override it.

```js
const countries = await FileAttachment("./data/countries.json").json();
const marine = await FileAttachment("./data/marine.json").json();
const registry = await FileAttachment("./data/wiki.json").json();
```

```js
// The page mounts the very same component an external site would embed, so the
// embedding path is exercised every time this page is opened rather than being
// a second, untested way of assembling the same parts. Data is handed over
// directly, since Framework has already resolved the file attachments.
import {mount} from "./components/equal-earth-element.js";

const host = display(document.createElement("div"));

await mount(host, {
  data: {countries, marine, registry},
  invalidation
});
```

## What you are looking at

The Equal Earth projection is *equal-area* — every country covers screen space in
proportion to its true size, so the Mercator distortion that inflates the high
latitudes is gone. Because `d3.geoEqualEarth().rotate()` transforms spherical
coordinates **before** projecting, rotating produces a genuinely **oblique**
Equal Earth rather than a panned one: the projection's zero-distortion line moves
with you, so whichever region you swing to the centre is the region drawn most
faithfully. Watch the graticule — when the parallels stop being horizontal lines,
you are looking at an oblique aspect.

Dragging composes quaternions rather than adding degrees to Euler angles. That is
what lets the map travel past a pole instead of jamming against it, keeps
horizontal dragging following the cursor even when the world is upside down, and
lets a jump between preset views sweep the short arc in orientation space.

Country fills are chosen at build time by colouring the border graph, so no two
neighbouring countries share a colour.

## Putting this map on your own page

The map is a self-contained custom element. Build it with `npm run build:embed`,
serve `equal-earth.js` and the `data/` directory, then drop this into your page
(`run=false` here, so the sample below is shown rather than executed):

```html run=false
<script type="module" src="/equal-earth.js"></script>
<equal-earth-map data-base="/equal-earth-data" theme="auto"></equal-earth-map>
```

Everything renders inside a shadow root, so the map cannot disturb your styles
and your styles cannot disturb the map.
