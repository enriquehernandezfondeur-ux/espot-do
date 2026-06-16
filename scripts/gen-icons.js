/**
 * Generador de iconos/favicon de Espot.
 *
 * Fuente única de verdad: public/Favicon.png (icono oficial de marca).
 * Genera todos los tamaños usados por la plataforma a partir de ese archivo,
 * de forma 100% fiel al diseño (sin recrear el icono).
 *
 * Uso:  node scripts/gen-icons.js
 *
 * Salida (en public/):
 *   favicon.ico (16/32/48)  ·  favicon-16x16.png  ·  favicon-32x32.png
 *   apple-touch-icon.png (180, fondo navy)  ·  icon-192.png  ·  icon-512.png
 *   icon-maskable-512.png (Android adaptive, fondo navy)
 *
 * La configuración que consume estos archivos vive centralizada en
 * src/app/layout.tsx (metadata.icons) y public/manifest.json.
 */
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const PUB = path.join(__dirname, '..', 'public');
const SRC = path.join(PUB, 'Favicon.png');
const NAVY = '#03313C'; // navy de marca Espot

async function pngFrom(size, file, { flatten = false } = {}) {
  let img = sharp(SRC).resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } });
  if (flatten) img = img.flatten({ background: NAVY }); // iOS / Android adaptive no admiten transparencia
  await img.png({ compressionLevel: 9 }).toFile(path.join(PUB, file));
}

function buildIco(entries) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(entries.length, 4);
  const dir = Buffer.alloc(16 * entries.length);
  let offset = 6 + dir.length;
  const data = [];
  entries.forEach((e, i) => {
    const b = 16 * i;
    dir.writeUInt8(e.size >= 256 ? 0 : e.size, b + 0);
    dir.writeUInt8(e.size >= 256 ? 0 : e.size, b + 1);
    dir.writeUInt8(0, b + 2);
    dir.writeUInt8(0, b + 3);
    dir.writeUInt16LE(1, b + 4);
    dir.writeUInt16LE(32, b + 6);
    dir.writeUInt32LE(e.buf.length, b + 8);
    dir.writeUInt32LE(offset, b + 12);
    offset += e.buf.length;
    data.push(e.buf);
  });
  return Buffer.concat([header, dir, ...data]);
}

(async () => {
  await pngFrom(16,  'favicon-16x16.png');
  await pngFrom(32,  'favicon-32x32.png');
  await pngFrom(192, 'icon-192.png');
  await pngFrom(512, 'icon-512.png');
  await pngFrom(180, 'apple-touch-icon.png',  { flatten: true });
  await pngFrom(512, 'icon-maskable-512.png', { flatten: true });

  const ico = [];
  for (const s of [16, 32, 48]) {
    const buf = await sharp(SRC)
      .resize(s, s, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png({ compressionLevel: 9 }).toBuffer();
    ico.push({ size: s, buf });
  }
  fs.writeFileSync(path.join(PUB, 'favicon.ico'), buildIco(ico));

  console.log('Iconos de Espot generados en public/ ✓');
})();
