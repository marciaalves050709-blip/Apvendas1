const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const crcTable = new Int32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let j = 0; j < 8; j++) {
    c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
  }
  crcTable[i] = c;
}

function crc32(buf) {
  let crc = 0 ^ (-1);
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ buf[i]) & 0xFF];
  }
  return (crc ^ (-1)) >>> 0;
}

function createPng(width, height, pixelBuffer) {
  const rowSize = width * 4 + 1;
  const rawData = Buffer.alloc(rowSize * height);
  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // Filter 0
    pixelBuffer.copy(rawData, rowOffset + 1, y * width * 4, (y + 1) * width * 4);
  }

  const deflated = zlib.deflateSync(rawData);
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  function chunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, 'ascii');
    const crcBuf = Buffer.alloc(4);
    const crc = crc32(Buffer.concat([typeBuf, data]));
    crcBuf.writeUInt32BE(crc, 0);
    return Buffer.concat([len, typeBuf, data, crcBuf]);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // 8 bit
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  return Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflated),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

// Generate stylized icon buffer
function renderIcon(size, isMaskable = false) {
  const buf = Buffer.alloc(size * size * 4);
  const scale = size / 512;
  const padScale = isMaskable ? 0.76 : 1.0; // Maskable safe zone margin (10-15% padding)
  const offset = isMaskable ? (size * (1 - padScale) / 2) : 0;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      
      // Default dark indigo background for maskable (full bleed)
      let r = 30, g = 27, b = 75, a = 255; // #1e1b4b

      // Gradient background inside
      const t = (x + y) / (size * 2);
      r = Math.round(30 + t * (79 - 30));
      g = Math.round(27 + t * (70 - 27));
      b = Math.round(75 + t * (229 - 75));

      // Coordinate mapped to 512x512 canvas
      const nx = (x - offset) / (scale * padScale);
      const ny = (y - offset) / (scale * padScale);

      // Rounded rectangle bounds for non-maskable
      if (!isMaskable) {
        const cornerR = 120;
        const inLeft = nx < cornerR;
        const inRight = nx > 512 - cornerR;
        const inTop = ny < cornerR;
        const inBottom = ny > 512 - cornerR;
        let outside = false;

        if (inLeft && inTop) {
          const dx = cornerR - nx;
          const dy = cornerR - ny;
          if (dx * dx + dy * dy > cornerR * cornerR) outside = true;
        } else if (inRight && inTop) {
          const dx = nx - (512 - cornerR);
          const dy = cornerR - ny;
          if (dx * dx + dy * dy > cornerR * cornerR) outside = true;
        } else if (inLeft && inBottom) {
          const dx = cornerR - nx;
          const dy = ny - (512 - cornerR);
          if (dx * dx + dy * dy > cornerR * cornerR) outside = true;
        } else if (inRight && inBottom) {
          const dx = nx - (512 - cornerR);
          const dy = ny - (512 - cornerR);
          if (dx * dx + dy * dy > cornerR * cornerR) outside = true;
        }

        if (outside || nx < 0 || nx > 512 || ny < 0 || ny > 512) {
          buf[idx] = 0;
          buf[idx + 1] = 0;
          buf[idx + 2] = 0;
          buf[idx + 3] = 0;
          continue;
        }
      }

      // Shopping bag handle arc (Center 256, 170, radius 60, width 14)
      if (ny <= 180 && ny >= 110 && nx >= 180 && nx <= 332) {
        const hx = nx - 256;
        const hy = ny - 170;
        const dist = Math.sqrt(hx * hx + hy * hy);
        if (dist >= 46 && dist <= 62) {
          // Amber handle #f59e0b
          r = 245; g = 158; b = 11;
        }
      }

      // Shopping bag body (Trapezoid from y=180 to 400)
      if (ny >= 180 && ny <= 400) {
        const progress = (ny - 180) / 220;
        const leftX = 140 - progress * 20; // 140 to 120
        const rightX = 372 + progress * 20; // 372 to 392
        if (nx >= leftX && nx <= rightX) {
          // White bag body with subtle vertical shading
          const bagShade = Math.round(255 - progress * 15);
          r = bagShade;
          g = bagShade;
          b = bagShade;

          // Lightning Bolt in center
          // Upper triangle
          const isBolt = (
            (ny >= 220 && ny <= 285 && nx >= 220 && nx <= 280 && (nx - 220) * 1.5 >= (ny - 220)) ||
            (ny >= 275 && ny <= 350 && nx >= 235 && nx <= 295 && (nx - 235) * 1.4 <= (ny - 275))
          );
          if (isBolt) {
            // Indigo bolt #4f46e5
            r = 79; g = 70; b = 229;
          }
        }
      }

      // Floating Emerald Badge (Circle cx=365, cy=150, r=46)
      const bx = nx - 365;
      const by = ny - 150;
      const bDist = Math.sqrt(bx * bx + by * by);
      if (bDist <= 46) {
        // Emerald #10b981
        r = 16; g = 185; b = 129;

        // Checkmark inside badge
        // Line 1: from (345, 150) to (358, 163)
        // Line 2: from (358, 163) to (385, 136)
        const inCheck1 = Math.abs((nx - 345) - (ny - 150)) <= 4 && nx >= 345 && nx <= 358;
        const inCheck2 = Math.abs((nx - 358) + (ny - 163)) <= 4 && nx >= 358 && nx <= 385;
        if (inCheck1 || inCheck2) {
          r = 255; g = 255; b = 255;
        }
      }

      buf[idx] = r;
      buf[idx + 1] = g;
      buf[idx + 2] = b;
      buf[idx + 3] = a;
    }
  }

  return createPng(size, size, buf);
}

const outDir = path.join(__dirname, '..', 'public');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

// 1. Apple Touch Icon (180x180)
const appleIcon = renderIcon(180, false);
fs.writeFileSync(path.join(outDir, 'apple-touch-icon.png'), appleIcon);
console.log('Created apple-touch-icon.png (180x180)');

// 2. PWA 192x192
const pwa192 = renderIcon(192, false);
fs.writeFileSync(path.join(outDir, 'pwa-192x192.png'), pwa192);
console.log('Created pwa-192x192.png (192x192)');

// 3. PWA 512x512
const pwa512 = renderIcon(512, false);
fs.writeFileSync(path.join(outDir, 'pwa-512x512.png'), pwa512);
console.log('Created pwa-512x512.png (512x512)');

// 4. PWA Maskable 512x512 (with safe margins)
const pwaMaskable = renderIcon(512, true);
fs.writeFileSync(path.join(outDir, 'pwa-maskable-512x512.png'), pwaMaskable);
console.log('Created pwa-maskable-512x512.png (512x512 maskable)');

// 5. Favicon
const favicon = renderIcon(64, false);
fs.writeFileSync(path.join(outDir, 'favicon.ico'), favicon);
console.log('Created favicon.ico');

console.log('All PWA mobile icon assets generated successfully!');
