// Generates icon-192.png and icon-512.png from favicon.svg
// Run once: node scripts/generate-icons.mjs
// Requires: npm install -D sharp

import { createRequire } from "module";
import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));

let sharp;
try {
  sharp = require("sharp");
} catch {
  console.error("Run: npm install -D sharp   then re-run this script.");
  process.exit(1);
}

const svgPath = join(__dirname, "../public/favicon.svg");
const svgBuffer = readFileSync(svgPath);

// Wrap the icon in a square dark background for each size
async function makeIcon(size, outPath) {
  const padding = Math.round(size * 0.1);
  const inner = size - padding * 2;

  // Resize SVG to inner size, then composite on dark background
  const resized = await sharp(svgBuffer)
    .resize(inner, inner)
    .png()
    .toBuffer();

  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 13, g: 17, b: 23, alpha: 1 }, // #0d1117
    },
  })
    .composite([{ input: resized, top: padding, left: padding }])
    .png()
    .toFile(outPath);

  console.log(`✓ ${outPath}`);
}

await makeIcon(192, join(__dirname, "../public/icon-192.png"));
await makeIcon(512, join(__dirname, "../public/icon-512.png"));
console.log("Icons generated.");
