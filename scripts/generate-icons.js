import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

// Minimal PNG builder in pure Node.js (no external deps required)
function createPng(width, height, getPixel) {
  // PNG signature
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  // IHDR chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  const ihdrChunk = createChunk('IHDR', ihdr);

  // Raw image data with scanline filter (0 = None)
  const rawLines = [];
  for (let y = 0; y < height; y++) {
    const line = Buffer.alloc(1 + width * 4);
    line[0] = 0; // No filter
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = getPixel(x, y, width, height);
      const offset = 1 + x * 4;
      line[offset] = r;
      line[offset + 1] = g;
      line[offset + 2] = b;
      line[offset + 3] = a;
    }
    rawLines.push(line);
  }

  const rawData = Buffer.concat(rawLines);
  const compressedData = zlib.deflateSync(rawData);
  const idatChunk = createChunk('IDAT', compressedData);
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function createChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const bufToCrc = Buffer.concat([typeBuf, data]);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(bufToCrc), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

// CRC32 implementation
const crcTable = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = (crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8)) >>> 0;
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function drawHouse(x, y, w, h) {
  // Normalize coordinates to 0..1
  const nx = x / w;
  const ny = y / h;

  // Navy background: #273b59 -> (39, 59, 89)
  let r = 39, g = 59, b = 89, a = 255;

  // Outer padding check
  const margin = 0.15;
  if (nx < margin || nx > 1 - margin || ny < margin || ny > 1 - margin) {
    return [r, g, b, a];
  }

  // House roof: triangle from top (0.5, 0.25) to (0.2, 0.48) and (0.8, 0.48)
  const isRoof = ny >= 0.25 && ny <= 0.48 && (
    Math.abs(nx - 0.5) <= (ny - 0.25) * (0.3 / 0.23)
  );

  // House body: rectangle from (0.26, 0.48) to (0.74, 0.78)
  const isBody = nx >= 0.26 && nx <= 0.74 && ny >= 0.48 && ny <= 0.78;

  // Door cutout: rectangle from (0.42, 0.58) to (0.58, 0.78)
  const isDoor = nx >= 0.42 && nx <= 0.58 && ny >= 0.58 && ny <= 0.78;

  if ((isRoof || isBody) && !isDoor) {
    // White house color
    r = 255; g = 255; b = 255;
  } else if (isDoor) {
    // Sage accent door color: #3f6f68 -> (63, 111, 104)
    r = 63; g = 111; b = 104;
  }

  return [r, g, b, a];
}

const publicDir = path.resolve('public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), createPng(192, 192, drawHouse));
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), createPng(512, 512, drawHouse));
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), createPng(180, 180, drawHouse));

console.log('PWA Icons generated successfully!');
