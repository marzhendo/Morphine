import sharp from 'sharp';
import { mkdirSync, writeFileSync } from 'fs';

mkdirSync('src-tauri/icons', { recursive: true });

const SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256">
  <rect width="256" height="256" fill="#040c04"/>
  <polygon points="128,56 184,88 184,152 128,184 72,152 72,88" fill="#071407" stroke="#39ff14" stroke-width="3"/>
  <polygon points="128,56 184,88 184,152 128,184 72,152 72,88" fill="none" stroke="#1a5a1a" stroke-width="8" stroke-dasharray="6,12"/>
  <polygon points="128,100 158,118 158,152 128,168 98,152 98,118" fill="#39ff14"/>
  <circle cx="128" cy="56"  r="10" fill="#040c04" stroke="#39ff14" stroke-width="3"/>
  <circle cx="184" cy="88"  r="10" fill="#040c04" stroke="#39ff14" stroke-width="3"/>
  <circle cx="184" cy="152" r="10" fill="#040c04" stroke="#39ff14" stroke-width="3"/>
  <circle cx="128" cy="184" r="12" fill="#39ff14"/>
  <circle cx="72"  cy="152" r="10" fill="#040c04" stroke="#39ff14" stroke-width="3"/>
  <circle cx="72"  cy="88"  r="10" fill="#040c04" stroke="#39ff14" stroke-width="3"/>
  <text x="128" y="148" font-family="monospace" font-size="48" font-weight="700"
        fill="#040c04" text-anchor="middle">M</text>
</svg>`;

const svgBuffer = Buffer.from(SVG);

const sizes = [
  { file: 'src-tauri/icons/32x32.png',       size: 32  },
  { file: 'src-tauri/icons/128x128.png',      size: 128 },
  { file: 'src-tauri/icons/128x128@2x.png',   size: 256 },
  { file: 'src-tauri/icons/icon.png',         size: 512 },
];

for (const { file, size } of sizes) {
  await sharp(svgBuffer).resize(size, size).png().toFile(file);
  console.log(`generated ${file}`);
}

// ICO untuk Windows (multi-size)
await sharp(svgBuffer).resize(256, 256).png().toFile('src-tauri/icons/icon-256.png');
console.log('generated src-tauri/icons/icon-256.png');

// Programmatic conversion to .ico to save the user a manual step
console.log('Generating multi-resolution src-tauri/icons/icon.ico programmatically...');
const icoSizes = [16, 32, 48, 256];
const pngBuffers = [];

for (const size of icoSizes) {
  const buf = await sharp(svgBuffer).resize(size, size).png().toBuffer();
  pngBuffers.push({ buffer: buf, width: size, height: size });
}

function createIco(pngImages) {
  const HEADER_SIZE = 6;
  const ENTRY_SIZE = 16;
  const numImages = pngImages.length;
  
  const header = Buffer.alloc(HEADER_SIZE);
  header.writeUInt16LE(0, 0); // Reserved
  header.writeUInt16LE(1, 2); // Type: 1 = ICO
  header.writeUInt16LE(numImages, 4); // Number of images
  
  const entries = [];
  const datas = [];
  let currentOffset = HEADER_SIZE + ENTRY_SIZE * numImages;
  
  for (const img of pngImages) {
    const entry = Buffer.alloc(ENTRY_SIZE);
    const w = img.width >= 256 ? 0 : img.width;
    const h = img.height >= 256 ? 0 : img.height;
    
    entry.writeUInt8(w, 0); // Width
    entry.writeUInt8(h, 1); // Height
    entry.writeUInt8(0, 2); // Colors (0 = no palette)
    entry.writeUInt8(0, 3); // Reserved
    entry.writeUInt16LE(1, 4); // Color planes
    entry.writeUInt16LE(32, 6); // Bits per pixel (usually 32 for PNG with alpha)
    entry.writeUInt32LE(img.buffer.length, 8); // Size of image data
    entry.writeUInt32LE(currentOffset, 12); // Offset of image data from beginning of file
    
    entries.push(entry);
    datas.push(img.buffer);
    currentOffset += img.buffer.length;
  }
  
  return Buffer.concat([header, ...entries, ...datas]);
}

const icoBuffer = createIco(pngBuffers);
writeFileSync('src-tauri/icons/icon.ico', icoBuffer);
console.log('successfully generated src-tauri/icons/icon.ico programmatically!');
