/**
 * Remove pixels conectados à borda que são pretos/quase pretos (fundo da arte),
 * deixando alpha = 0. Usa sharp para ler/gravar PNG tolerantes a arquivos não padrão.
 */
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

const SRC = process.argv[2] || path.join(root, 'public', 'booknow-source.png');
const OUT = process.argv[3] || path.join(root, 'public', 'booknow-mark.png');

function isBg(r, g, b) {
  return r < 28 && g < 28 && b < 28;
}

const { data, info } = await sharp(SRC).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const w = info.width;
const h = info.height;
const channels = info.channels;
if (channels !== 4) throw new Error('Expected RGBA');

const visited = new Uint8Array(w * h);
const queue = [];

function idx(x, y) {
  return (y * w + x) * 4;
}

function pushEdge() {
  for (let x = 0; x < w; x++) {
    queue.push([x, 0]);
    queue.push([x, h - 1]);
  }
  for (let y = 0; y < h; y++) {
    queue.push([0, y]);
    queue.push([w - 1, y]);
  }
}

pushEdge();

while (queue.length) {
  const [x, y] = queue.pop();
  const i = y * w + x;
  if (x < 0 || x >= w || y < 0 || y >= h || visited[i]) continue;
  const p = idx(x, y);
  const r = data[p];
  const g = data[p + 1];
  const b = data[p + 2];
  if (!isBg(r, g, b)) continue;
  visited[i] = 1;
  data[p + 3] = 0;
  queue.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
}

await sharp(Buffer.from(data), {
  raw: { width: w, height: h, channels: 4 },
})
  .png({ compressionLevel: 9 })
  .toFile(OUT);

console.log('Wrote', OUT, fs.statSync(OUT).size, 'bytes');
