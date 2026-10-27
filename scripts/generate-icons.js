import fs from 'fs';
import zlib from 'zlib';

function createPNG(width, height, colorR, colorG, colorB) {
  // Simple PNG generator with solid color and Omega badge
  const rowSize = width * 4 + 1; // 1 filter byte + RGBA
  const rawData = Buffer.alloc(rowSize * height);

  const centerX = width / 2;
  const centerY = height / 2;
  const radius = width * 0.38;

  for (let y = 0; y < height; y++) {
    const rowStart = y * rowSize;
    rawData[rowStart] = 0; // Filter: None
    for (let x = 0; x < width; x++) {
      const px = rowStart + 1 + x * 4;
      const dx = x - centerX;
      const dy = y - centerY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist <= radius) {
        // Inner circle: Violet #5B3DF5
        if (Math.abs(dx) < width * 0.12 && Math.abs(dy) < height * 0.12) {
          // White center symbol
          rawData[px] = 255;
          rawData[px + 1] = 255;
          rawData[px + 2] = 255;
          rawData[px + 3] = 255;
        } else {
          rawData[px] = 0x5B;
          rawData[px + 1] = 0x3D;
          rawData[px + 2] = 0xF5;
          rawData[px + 3] = 255;
        }
      } else {
        // Background: Navy #101A3A
        rawData[px] = colorR;
        rawData[px + 1] = colorG;
        rawData[px + 2] = colorB;
        rawData[px + 3] = 255;
      }
    }
  }

  const deflated = zlib.deflateSync(rawData);

  // PNG Signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  function makeChunk(type, data) {
    const len = data.length;
    const buf = Buffer.alloc(8 + len + 4);
    buf.writeUInt32BE(len, 0);
    buf.write(type, 4);
    data.copy(buf, 8);
    // CRC calculation
    const crc = crc32(buf.subarray(4, 8 + len));
    buf.writeUInt32BE(crc, 8 + len);
    return buf;
  }

  // Simple CRC32
  function crc32(buf) {
    let crc = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
      crc ^= buf[i];
      for (let j = 0; j < 8; j++) {
        crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
      }
    }
    return (crc ^ 0xffffffff) >>> 0;
  }

  const ihdrChunk = makeChunk('IHDR', ihdr);
  const idatChunk = makeChunk('IDAT', deflated);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

const p192 = createPNG(192, 192, 0x10, 0x1A, 0x3A);
fs.writeFileSync('public/pwa-192x192.png', p192);

const p512 = createPNG(512, 512, 0x10, 0x1A, 0x3A);
fs.writeFileSync('public/pwa-512x512.png', p512);

const pMaskable = createPNG(512, 512, 0x10, 0x1A, 0x3A);
fs.writeFileSync('public/pwa-maskable-512x512.png', pMaskable);

const appleIcon = createPNG(180, 180, 0x10, 0x1A, 0x3A);
fs.writeFileSync('public/apple-touch-icon.png', appleIcon);

console.log('Generated PNG icons successfully.');
