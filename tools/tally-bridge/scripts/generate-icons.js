const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');

// CRC32 implementation for PNG chunks
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
        c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    crcTable[n] = c;
}

function crc32(buf) {
    let c = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
        c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
    }
    return (c ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);

    const typeBuf = Buffer.from(type, 'ascii');
    const body = Buffer.concat([typeBuf, data]);

    const crcBuf = Buffer.alloc(4);
    crcBuf.writeUInt32BE(crc32(body), 0);

    return Buffer.concat([len, body, crcBuf]);
}

function createCirclePng(r, g, b, a = 255, size = 16) {
    const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

    // IHDR
    const ihdrData = Buffer.alloc(13);
    ihdrData.writeUInt32BE(size, 0);
    ihdrData.writeUInt32BE(size, 4);
    ihdrData[8] = 8; // bit depth
    ihdrData[9] = 6; // color type RGBA
    ihdrData[10] = 0; // compression
    ihdrData[11] = 0; // filter
    ihdrData[12] = 0; // interlace
    const ihdr = makeChunk('IHDR', ihdrData);

    // Scanlines
    const raw = Buffer.alloc(size * (1 + size * 4));
    const center = (size - 1) / 2;
    const radius = size * 0.42;

    let offset = 0;
    for (let y = 0; y < size; y++) {
        raw[offset++] = 0; // filter type 0 (None)
        for (let x = 0; x < size; x++) {
            const dx = x - center;
            const dy = y - center;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist <= radius) {
                // Inside circle
                raw[offset++] = r;
                raw[offset++] = g;
                raw[offset++] = b;
                raw[offset++] = a;
            } else if (dist <= radius + 0.8) {
                // Anti-aliased edge
                const alpha = Math.max(0, Math.min(1, radius + 0.8 - dist));
                raw[offset++] = r;
                raw[offset++] = g;
                raw[offset++] = b;
                raw[offset++] = Math.round(a * alpha);
            } else {
                // Transparent
                raw[offset++] = 0;
                raw[offset++] = 0;
                raw[offset++] = 0;
                raw[offset++] = 0;
            }
        }
    }

    const compressed = zlib.deflateSync(raw);
    const idat = makeChunk('IDAT', compressed);
    const iend = makeChunk('IEND', Buffer.alloc(0));

    return Buffer.concat([signature, ihdr, idat, iend]);
}

const assetsDir = path.join(__dirname, '..', 'assets');
if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir, { recursive: true });
}

// Green (#22c55e): Paired, cloud OK, Tally reachable
fs.writeFileSync(path.join(assetsDir, 'icon-green.png'), createCirclePng(34, 197, 94));
// Amber (#f59e0b): Paired, cloud or Tally problem
fs.writeFileSync(path.join(assetsDir, 'icon-amber.png'), createCirclePng(245, 158, 11));
// Grey (#9ca3af): Unpaired or auth_failed
fs.writeFileSync(path.join(assetsDir, 'icon-grey.png'), createCirclePng(156, 163, 175));

console.log('✅ Generated 3 tray icons in assets/');
