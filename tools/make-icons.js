// Usage: node tools/make-icons.js
// Renders icon-192.png and icon-512.png (crate pushed towards a star) with no dependencies.
// Artwork stays inside the central ~70% so the icons are safe as "maskable".
const fs = require('fs'), zlib = require('zlib'), path = require('path');

function inPoly(x, y, pts) {
  let c = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i], [xj, yj] = pts[j];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c;
  }
  return c;
}
// 8-point star like the in-game target, centred at (cx,cy), outer radius R
const star = (cx, cy, R) => [[0,-1],[.33,-.33],[1,0],[.33,.33],[0,1],[-.33,.33],[-1,0],[-.33,-.33]].map(([a, b]) => [cx + a * R, cy + b * R]);
const STAR = star(0.62, 0.38, 0.27);

// colour at normalised coordinates (0..1)
function shade(x, y) {
  const inBox = (x0, y0, x1, y1) => x >= x0 && x < x1 && y >= y0 && y < y1;
  // crate: x .22-.58, y .46-.82
  if (inBox(.22, .46, .58, .82)) {
    if (inBox(.25, .49, .55, .79)) {
      if (inBox(.33, .57, .47, .66)) return [217, 210, 195];  // label
      return [169, 128, 98];
    }
    return [138, 98, 70];
  }
  if (inPoly(x, y, STAR)) return [255, 233, 138];
  return [27, 42, 56];
}

function render(size) {
  const raw = Buffer.alloc((size * 4 + 1) * size), SS = 3;
  for (let py = 0; py < size; py++) {
    raw[py * (size * 4 + 1)] = 0;
    for (let px = 0; px < size; px++) {
      let r = 0, g = 0, b = 0;
      for (let sy = 0; sy < SS; sy++) for (let sx = 0; sx < SS; sx++) {
        const c = shade((px + (sx + .5) / SS) / size, (py + (sy + .5) / SS) / size);
        r += c[0]; g += c[1]; b += c[2];
      }
      const o = py * (size * 4 + 1) + 1 + px * 4, n = SS * SS;
      raw[o] = r / n; raw[o + 1] = g / n; raw[o + 2] = b / n; raw[o + 3] = 255;
    }
  }
  const crcT = [...Array(256)].map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
  const crc = buf => { let c = 0xffffffff; for (const b of buf) c = crcT[(c ^ b) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const chunk = (type, data) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type), data]);
    const cr = Buffer.alloc(4); cr.writeUInt32BE(crc(td));
    return Buffer.concat([len, td, cr]);
  };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

for (const size of [192, 512]) {
  const f = path.join(__dirname, '..', `icon-${size}.png`);
  fs.writeFileSync(f, render(size));
  console.log('wrote', f);
}
