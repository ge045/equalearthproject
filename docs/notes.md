# Development notes

Traps this codebase has already fallen into. Each one cost real debugging time,
and several produced a **working build, a passing test suite, and a broken
page** simultaneously — so none of them are discoverable by running `npm test`.

## Observable Framework

**Imports may not escape `src/`.** Anything the browser loads must live under
`src/`. Data loaders (`src/data/*.json.js`) run in Node at build time and *may*
reach out into `lib/`, but never the reverse. That is why `registry.js` sits in
`src/components/` even though the loaders use it.

**Never use a browser global inside a page code block.** Framework compiles each
` ```js ` block on a page into `async (freeIdentifiers…) => {…}` and supplies the
arguments from its runtime. `Event`, `window`, `document` and `localStorage`
therefore become unresolvable *parameters*: the cell errors, everything it
declares silently never renders, and `observable build` still exits 0. Put such
code in a module under `src/components/` — modules are not compiled this way.
See `dom.js`; `test/page-cells.test.js` guards the compiled graph.

**`view()`, not `viewof`.** `viewof` is notebook-only syntax.

**Browser modules import d3 as `npm:d3`.** `vitest.config.js` aliases the `npm:`
specifiers onto the real packages so the same files run under Node.

## Tooling

**Vite/esbuild does not verify re-exports; browsers do.** A stale
`export {x} from "./m.js"` passes the whole unit suite and then fails at load
with *"does not provide an export named x"*. `test/module-link.test.js` links
every browser module in a **separate Node process** — calling `import()` from
inside vitest goes through Vite's module runner and passes on broken code.

**Never add `canvas` to `package.json`.** jsdom declares
`peerOptional canvas@^2.11.2`, so a v3 entry makes every later `npm install`
fail with ERESOLVE. `scripts/snapshot.js` expects an ad-hoc
`npm i --no-save --legacy-peer-deps canvas`.

**`input.value` is always a string.** `input.value === 90` is never true, so an
echo guard written that way never fires and the map and slider feed each other
indefinitely. Compare with `Number()`.

## Geography

**`d3-geo` winds polygons clockwise** — the reverse of GeoJSON RFC 7946. A
mis-wound exterior ring is read as the *complement* of the shape and floods the
whole map. The failure is silent, not an exception. Never use `d3.geoBounds` to
derive a bounding box from RFC-compliant input.

**Five features in the 50m dataset have no ISO code**: Kosovo, Somaliland,
N. Cyprus, Indian Ocean Ter. and Siachen Glacier. Key countries through
`countryKey()`, never through a raw `feature.id`, or all five collapse onto one
key.

**Highlight by `countryKey()`, not object identity.** Natural Earth splits the
Pacific and Atlantic into same-named halves, and Australia is two features
sharing ISO 036. Identity lights only the piece under the cursor. Features with
no derivable key fall back to identity, which is what keeps the five ISO-less
territories apart.

**Country fills come from build-time graph colouring**, not an ordinal scale.
`lib/graph-colour.js` colours the border graph so no two neighbours match, and
balances usage across the palette — taking the textbook lowest-free colour is
valid but dumps every low-degree country onto colour 0. The loader writes the
index to `properties.colour`; read it through `paletteColour()` in `scene.js`.
Never re-derive a fill from the key, or the browser and `scripts/snapshot.js`
drift apart, which they once did silently.

## Rotation

**Rotation is quaternion-based (`versor`), not Euler increments.** Adding degrees
to `[yaw, pitch, roll]` gimbal-locks: pitch has to be clamped at the poles, so
the map stops travelling once a pole reaches the centre, and past ±90 the yaw
axis inverts so horizontal dragging runs backwards. `freeRotation()` composes
quaternions instead. Invert the cursor through the rotation captured at drag
*start*, never the live one.

**`d3.drag()`'s default filter rejects `ctrlKey`** — it guards against macOS
secondary click — which silently kills Ctrl-drag as a modifier gesture.
`map.js` overrides the filter to `!event.button`.

**`views.js` must not import `rotation.js`.** That drags `npm:versor` in and
breaks plain-Node consumers such as `scripts/snapshot.js`. Pure angle helpers
live in `src/components/angles.js` for exactly this reason.

**Do not paint from event handlers.** Set a dirty flag and let the
`requestAnimationFrame` loop paint, or the map repaints several times per frame.

**Never stroke the hit-test buffer.** A blended edge decodes to a third,
nonexistent feature index.

## Theming

**Two palettes with the same number of land colours.** Graph colouring assigns
each country an index into `theme.land`, so a theme with a different number of
entries would change a country's colour relative to its neighbours when the
theme flips.

**Unsubscribe from `matchMedia`.** A leaked listener keeps the whole map closure
alive, map data included. `createMap().destroy()` exists for exactly this.

## Testing

Tests use `d3-geo` itself as the oracle where possible — projecting a point to
check which way a drag moved it, or calling `geoBounds` to catch a winding bug —
rather than asserting on coordinate order by eye.

**jsdom + d3-drag:** d3-drag reads `event.view`, but jsdom's `MouseEvent`
constructor rejects the global window as a `Window` under vitest. Construct the
event without `view`, then `Object.defineProperty(ev, "view", {value: window})`.
See `dragCanvas()` in `test/create-map.test.js`.

**A fake `requestAnimationFrame` must not run callbacks synchronously.** An
animation will recurse to completion inside a single call, so every duration
looks instantaneous and the test proves nothing. Use a queue you flush yourself;
see `frameRunner()` in `test/create-map.test.js`.
