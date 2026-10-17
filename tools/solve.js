// Usage: node tools/solve.js [index.html] [--write] [--prove]
// Solves every stage with the SAME solver the in-game HINT uses (solveBFS, taken from index.html), proves each
// stage solvable, then re-plays the answer with an independent mini game engine to check it really wins in
// exactly that many moves. Win = every star has a box on it (spare boxes are allowed).
// The optimal move lists are embedded in index.html as `const SOLUTIONS` (used by HINT / par display):
//   (default) fail with exit 1 if the embedded block is missing or out of date
//   --write   regenerate that block in index.html
//   --prove   ignore tools/par-cache.json and re-solve every stage from scratch (the 6-box stage takes ~4 minutes)
// Proven solutions are cached in tools/par-cache.json (keyed by the stage layout) so normal runs are instant; a cached
// answer is still re-played in the independent engine every time. Run --prove after changing solveBFS.
const fs = require('fs');
const path = require('path');
const file = process.argv.slice(2).find(a => !a.startsWith('--')) || 'index.html';
const write = process.argv.includes('--write'), prove = process.argv.includes('--prove');
const cacheFile = path.join(__dirname, 'par-cache.json');
let cache = {}; try { cache = JSON.parse(fs.readFileSync(cacheFile, 'utf8')); } catch (e) {}
const newCache = {};
const raw = fs.readFileSync(file, 'utf8');
const crlf = raw.includes('\r\n');
const src = raw.replace(/\r\n/g, '\n');
const LEVELS = eval(src.match(/const LEVELS = (\[[\s\S]*?\n\]);/)[1]);
const solveBFS = eval('(' + src.match(/function solveBFS\(s\)\{[\s\S]*?\n\}\n/)[0] + ')');
const DIRS = { U: [0, -1], D: [0, 1], L: [-1, 0], R: [1, 0] };

// independent engine: returns the number of moves if the path is legal and ends on a win, else -1
function replay(rows, sol) {
  const H = rows.length, W = Math.max(...rows.map(r => r.length));
  const ch = (x, y) => (y < 0 || y >= H || x < 0 || x >= W) ? '_' : (rows[y][x] || '_');
  const targets = new Set(), boxes = new Set(); let px, py;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const c = ch(x, y); if (c === '.') targets.add(x + ',' + y); if (c === '$') boxes.add(x + ',' + y); if (c === '@') { px = x; py = y; }
  }
  for (const m of sol) {
    const [dx, dy] = DIRS[m.toUpperCase()], nx = px + dx, ny = py + dy;
    if ('#_'.includes(ch(nx, ny))) return -1;
    const k = nx + ',' + ny;
    if (boxes.has(k)) {
      const bx = nx + dx, by = ny + dy, bk = bx + ',' + by;
      if (m !== m.toLowerCase() || '#_'.includes(ch(bx, by)) || boxes.has(bk)) return -1;
      boxes.delete(k); boxes.add(bk);
    } else if (m !== m.toUpperCase()) return -1;     // lowercase = push; must actually push
    px = nx; py = ny;
  }
  return [...targets].every(t => boxes.has(t)) ? sol.length : -1;
}

let bad = 0;
const sols = [];
LEVELS.forEach((rows, i) => {
  const H = rows.length, W = Math.max(...rows.map(r => r.length));
  const blocked = new Array(W * H).fill(0), goal = new Array(W * H).fill(0), boxes = []; let player;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const c = rows[y][x] || '_', id = y * W + x;
    if (c === '#' || c === '_') blocked[id] = 1;
    if (c === '.') goal[id] = 1; if (c === '$') boxes.push(id); if (c === '@') player = id;
  }
  const nT = goal.reduce((a, b) => a + b, 0);
  const t0 = Date.now(), lk = rows.join('|');
  let sol = (!prove && typeof cache[lk] === 'string' && replay(rows, cache[lk]) === cache[lk].length) ? cache[lk] : undefined;
  if (sol === undefined) sol = (boxes.length < nT || player === undefined) ? null : solveBFS({ W, H, blocked, goal, boxes, player, limit: 16000000 });
  const note = (typeof sol === 'string' && replay(rows, sol) !== sol.length) ? 'REPLAY FAILED' : '';
  if (typeof sol !== 'string' || note) { bad++; sols.push(null); console.log(`Stage ${i + 1}: ${sol === -1 ? 'GAVE UP (too big)' : 'NOT SOLVABLE'} ${note}`); }
  else {
    sols.push(sol); newCache[lk] = sol;
    console.log(`Stage ${i + 1}: ${boxes.length} boxes, ${sol.length} moves, ${(sol.match(/[a-z]/g) || []).length} pushes (${Date.now() - t0} ms)\n  ${sol}`);
  }
});
if (!bad) {
  if (JSON.stringify(newCache) !== JSON.stringify(cache)) {
    fs.writeFileSync(cacheFile, '{\n' + Object.entries(newCache).map(([k, v]) => JSON.stringify(k) + ': ' + JSON.stringify(v)).join(',\n') + '\n}\n');
  }
  const block = 'const SOLUTIONS = [\n' + sols.map(s => '"' + s + '"').join(',\n') + '\n];';
  const re = /const SOLUTIONS = \[[\s\S]*?\];/;
  const m = src.match(re);
  if (write) {
    if (!m) { console.log('No `const SOLUTIONS = [...];` block found in ' + file); process.exit(1); }
    const out = src.replace(re, () => block);
    fs.writeFileSync(file, crlf ? out.replace(/\n/g, '\r\n') : out);
    console.log('SOLUTIONS block written to ' + file);
  } else if (!m || m[0] !== block) {
    console.log('SOLUTIONS block in ' + file + ' is missing or stale — run: node tools/solve.js ' + file + ' --write');
    bad++;
  } else console.log('SOLUTIONS block is up to date.');
}
// tools/sprite-editor.html carries a copy of drawPlayer(); fail if it drifted from the game's
try {
  const fnRe = /function drawPlayer\(X,Y\)\{[\s\S]*?\n\}\n/;
  const ed = fs.readFileSync(path.join(__dirname, 'sprite-editor.html'), 'utf8').replace(/\r\n/g, '\n');
  const a = src.match(fnRe), b = ed.match(fnRe);
  if (!a || !b || a[0] !== b[0]) { console.log('tools/sprite-editor.html drawPlayer() is out of sync with ' + file + ' — copy the function over'); bad++; }
  else console.log('sprite-editor.html drawPlayer() is in sync.');
} catch (e) { console.log('sprite-editor.html check skipped: ' + e.message); }
process.exit(bad ? 1 : 0);
