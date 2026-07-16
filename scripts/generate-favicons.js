const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const tmp = path.join(root, ".tmp-icons");

async function makePng(size, out) {
  const fontSize = Math.round(size * 0.62);
  const y = Math.round(size * 0.72);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
  <rect width="100%" height="100%" fill="#131313"/>
  <text x="50%" y="${y}" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="${fontSize}" font-weight="700" fill="#ffb4a2">K</text>
</svg>`;
  await sharp(Buffer.from(svg)).png().toFile(out);
  return out;
}

/** Minimal ICO writer (PNG-compressed images) */
function pngsToIco(pngBuffers) {
  const count = pngBuffers.length;
  const headerSize = 6 + count * 16;
  let offset = headerSize;
  const entries = [];
  for (const png of pngBuffers) {
    // IHDR is at bytes 16-23: width/height as uint32 BE
    const width = png.readUInt32BE(16);
    const height = png.readUInt32BE(20);
    entries.push({
      width: width >= 256 ? 0 : width,
      height: height >= 256 ? 0 : height,
      size: png.length,
      offset,
      png,
    });
    offset += png.length;
  }

  const total = offset;
  const out = Buffer.alloc(total);
  // ICONDIR
  out.writeUInt16LE(0, 0);
  out.writeUInt16LE(1, 2); // ICO
  out.writeUInt16LE(count, 4);

  let entryPos = 6;
  for (const e of entries) {
    out.writeUInt8(e.width, entryPos);
    out.writeUInt8(e.height, entryPos + 1);
    out.writeUInt8(0, entryPos + 2); // colors
    out.writeUInt8(0, entryPos + 3);
    out.writeUInt16LE(1, entryPos + 4); // planes
    out.writeUInt16LE(32, entryPos + 6); // bit count
    out.writeUInt32LE(e.size, entryPos + 8);
    out.writeUInt32LE(e.offset, entryPos + 12);
    entryPos += 16;
  }

  for (const e of entries) {
    e.png.copy(out, e.offset);
  }
  return out;
}

async function main() {
  fs.mkdirSync(tmp, { recursive: true });
  const pngPaths = [];
  for (const size of [16, 32, 48]) {
    pngPaths.push(await makePng(size, path.join(tmp, `icon-${size}.png`)));
  }

  const pngBuffers = pngPaths.map((p) => fs.readFileSync(p));
  const ico = pngsToIco(pngBuffers);

  const targets = [
    path.join(root, "frontend", "src", "app", "favicon.ico"),
    path.join(root, "admin", "src", "app", "favicon.ico"),
  ];
  for (const dest of targets) {
    fs.writeFileSync(dest, ico);
    console.log("wrote", dest, ico.length);
  }

  fs.rmSync(tmp, { recursive: true, force: true });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
