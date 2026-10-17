# Box Pusher

Sokoban-style puzzle for Android Chrome: push boxes until every star has a box on it. 27 stages, easiest first
(sorted by number of boxes, then by minimum moves). Some stages have spare boxes.

## Play
Open `index.html` in Chrome, or host the folder on any static host (e.g. GitHub Pages).
On Android: menu → **Add to Home screen / Install app** — it then works offline.

Controls
- **D-pad** (hold to repeat), **swipe on the board**, or arrow keys
- **UNDO** (`z`), **RESTART** (`r`)
- **HINT** (`h`) — replays an optimal solution from where you are, one step every ~0.17 s.
  Tap again (or make a move) to stop. A stage solved with a hint does not set a best score.
- **Tap the "Stage N" title** for the stage list: name, number of boxes, **par** (the minimum possible moves) and
  your best for every stage. The header also shows boxes, par and best for the current stage.

Stars: ★★★ = solved in par moves or fewer, ★★ = within 50% over par, ★ = solved (using a hint always gives ★).
The stage list opens with a summary: stages cleared, total stars and number of perfect (3-star) stages.

Saved in `localStorage`: `bp_lvl` (current stage), `bp_best2` (best moves per stage layout), `bp_stars` (stars).

## Files
- `index.html` — the whole game (HTML + CSS + JS). Playable on its own, no dependencies.
- `manifest.webmanifest`, `sw.js`, `icon-192.png`, `icon-512.png` — optional PWA install/offline support.
  Bump `CACHE` in `sw.js` whenever you change a cached file.
- `tools/solve.js` — proves every stage solvable, finds the minimum moves (par), double-checks each answer in a second
  game engine, and keeps the `SOLUTIONS` block in `index.html` (used by HINT and the par display) up to date.
  `tools/par-cache.json` caches the proven answers so normal runs take about a second.
- `tools/make-icons.js` — regenerates the PNG icons (no dependencies).
- `tools/tile-editor.html` — open in a browser to redraw the floor, wall, box, box-on-star and star pixel by pixel
  (32×32 or 64×64, PNG import, looks such as treasure chest / cherry / stone wall / grass); copy the generated
  `SPRITES` block into `index.html`.
- `tools/sprite-editor.html` — open in a browser to restyle the player (hair, hat, outfit, extras, colours, presets,
  live preview of every pose); copy the generated `PAL` and `LOOK` lines into `index.html`.

## Developing
```
node tools/solve.js index.html           # verify: exits 0 if all stages solvable and SOLUTIONS is current
node tools/solve.js index.html --write   # regenerate SOLUTIONS after adding/editing a stage
node tools/solve.js index.html --prove   # re-solve everything without the cache (~4 min, for solver changes)
```
Service workers need `http://localhost` or https, e.g. `npx http-server` or `python -m http.server`.
