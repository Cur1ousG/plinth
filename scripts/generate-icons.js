/* eslint-disable */
/**
 * Generates branded app icon and splash assets for Plinth.
 * Run with: node scripts/generate-icons.js
 *
 * Design system:
 *   - Brand orange gradient (#fb923c → #c2410c)
 *   - Lowercase "p" letterform built from a rounded rectangle stem and a ring (donut)
 *   - Sage-green basil leaf nestled into the top-right of the p's bowl
 *   - Cream white (#fff7ed) on the P shape for a warm, food-friendly feel
 *   - Soft inner shadow on the rounded square for depth
 */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const OUT_DIR = path.join(__dirname, '..', 'assets', 'images');

// --- Design primitives ----------------------------------------------------

const BRAND_LIGHT = '#fb923c';
const BRAND = '#f97316';
const BRAND_DEEP = '#c2410c';
const BRAND_DARKEST = '#7c2d12';
const CREAM = '#fff7ed';
const LEAF = '#84cc16';
const LEAF_DEEP = '#65a30d';

// SVG fragment that draws the lowercase "p" + leaf at the canvas centre.
// Centre of the canvas is (512, 512). Uses pure geometry (no fonts) so
// librsvg renders it identically everywhere.
function pGlyph({ fill = CREAM, leafFill = LEAF, leafStem = LEAF_DEEP, ringFill = 'url(#ringHole)' } = {}) {
  return `
    <!-- p stem -->
    <rect x="335" y="265" width="120" height="620" rx="60" fill="${fill}"/>

    <!-- p bowl (ring) -->
    <circle cx="565" cy="495" r="230" fill="${fill}"/>
    <circle cx="565" cy="495" r="118" fill="${ringFill}"/>

    <!-- basil leaf -->
    <g transform="translate(720 320) rotate(35)">
      <path d="M 0 0 C 30 -40, 90 -40, 110 0 C 90 40, 30 40, 0 0 Z" fill="${leafFill}"/>
      <line x1="-15" y1="6" x2="100" y2="-6" stroke="${leafStem}" stroke-width="4" stroke-linecap="round"/>
      <line x1="0" y1="0" x2="-55" y2="30" stroke="${leafStem}" stroke-width="6" stroke-linecap="round"/>
    </g>
  `;
}

// --- SVG documents --------------------------------------------------------

// Full app icon: gradient rounded square + p glyph
const ICON_SVG = `
<svg width="1024" height="1024" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${BRAND_LIGHT}"/>
      <stop offset="55%" stop-color="${BRAND}"/>
      <stop offset="100%" stop-color="${BRAND_DEEP}"/>
    </linearGradient>
    <radialGradient id="glow" cx="30%" cy="22%" r="65%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.35"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="ringHole" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${BRAND_LIGHT}"/>
      <stop offset="100%" stop-color="${BRAND_DEEP}"/>
    </linearGradient>
  </defs>

  <rect width="1024" height="1024" rx="220" fill="url(#bg)"/>
  <rect width="1024" height="1024" rx="220" fill="url(#glow)"/>

  ${pGlyph({ ringFill: 'url(#ringHole)' })}
</svg>
`;

// Splash icon: just the p glyph centred on transparent — Expo composes with splash bg
const SPLASH_ICON_SVG = `
<svg width="1024" height="1024" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="stem" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${BRAND_LIGHT}"/>
      <stop offset="100%" stop-color="${BRAND_DEEP}"/>
    </linearGradient>
  </defs>
  ${pGlyph({ fill: 'url(#stem)', ringFill: '#ffffff' })}
</svg>
`;

// Adaptive icon foreground (Android): glyph centred on transparent
// Android crops the foreground inside a circle/squircle, so keep glyph well inside safe area.
const ADAPTIVE_FOREGROUND_SVG = `
<svg width="1024" height="1024" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="ringHole2" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${BRAND_LIGHT}"/>
      <stop offset="100%" stop-color="${BRAND_DEEP}"/>
    </linearGradient>
  </defs>
  <!-- shifted/scaled to fit Android's 66% safe area -->
  <g transform="translate(170 170) scale(0.67)">
    ${pGlyph({ ringFill: '#ffffff' })}
  </g>
</svg>
`;

const ADAPTIVE_BACKGROUND_SVG = `
<svg width="1024" height="1024" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg2" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${BRAND_LIGHT}"/>
      <stop offset="55%" stop-color="${BRAND}"/>
      <stop offset="100%" stop-color="${BRAND_DEEP}"/>
    </linearGradient>
  </defs>
  <rect width="1024" height="1024" fill="url(#bg2)"/>
</svg>
`;

const ADAPTIVE_MONOCHROME_SVG = `
<svg width="1024" height="1024" xmlns="http://www.w3.org/2000/svg">
  <g transform="translate(170 170) scale(0.67)">
    ${pGlyph({ fill: '#ffffff', leafFill: '#ffffff', leafStem: '#ffffff', ringFill: 'rgba(0,0,0,0)' })}
  </g>
</svg>
`;

// --- Build pipeline -------------------------------------------------------

async function build() {
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

  const tasks = [
    // Main app icon — App Store / Play Store needs no transparency, so flatten on brand bg.
    {
      name: 'icon.png',
      svg: ICON_SVG,
      pipe: (img) => img.resize(1024, 1024).flatten({ background: BRAND }),
    },
    // Splash icon — transparent, Expo composes onto splash bg color from app.json
    {
      name: 'splash-icon.png',
      svg: SPLASH_ICON_SVG,
      pipe: (img) => img.resize(1024, 1024),
    },
    // Android adaptive icon
    {
      name: 'adaptive-icon-foreground.png',
      svg: ADAPTIVE_FOREGROUND_SVG,
      pipe: (img) => img.resize(1024, 1024),
    },
    {
      name: 'adaptive-icon-background.png',
      svg: ADAPTIVE_BACKGROUND_SVG,
      pipe: (img) => img.resize(1024, 1024),
    },
    {
      name: 'adaptive-icon-monochrome.png',
      svg: ADAPTIVE_MONOCHROME_SVG,
      pipe: (img) => img.resize(1024, 1024),
    },
    // Web favicon — small
    {
      name: 'favicon.png',
      svg: ICON_SVG,
      pipe: (img) => img.resize(64, 64).flatten({ background: BRAND }),
    },
  ];

  for (const t of tasks) {
    const out = path.join(OUT_DIR, t.name);
    let pipeline = sharp(Buffer.from(t.svg));
    pipeline = t.pipe(pipeline);
    await pipeline.png().toFile(out);
    const stat = fs.statSync(out);
    console.log(`✓ ${t.name.padEnd(36)} ${(stat.size / 1024).toFixed(1)} KB`);
  }
}

build().catch((err) => {
  console.error(err);
  process.exit(1);
});
