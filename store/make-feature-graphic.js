/**
 * Builds the Play feature graphic: 1024x500, the banner at the top of the
 * listing.
 *
 *   node store/make-feature-graphic.js
 *
 * Play crops and overlays this differently across surfaces — on some it sits
 * behind the app icon and title, and the edges can be trimmed. So everything
 * meaningful stays inside a generous margin, and there is no text near an edge.
 */

const path = require('path');
const sharp = require('sharp');

const W = 1024;
const H = 500;

const BRAND = '#ea580c';
const CHARCOAL = '#12100e';

const ICON = 260;
const ICON_X = 150;
const ICON_Y = (H - ICON) / 2;
const TEXT_X = 480;
// The source icon is a squircle with transparent corners. Rounding the tile we
// paint behind it by the same amount keeps those corners from being filled in.
const ICON_RADIUS = 58;

const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <defs>
    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="90"/>
    </filter>
    <filter id="drop" x="-50%" y="-50%" width="200%" height="200%">
      <feDropShadow dx="0" dy="14" stdDeviation="22" flood-opacity="0.45"/>
    </filter>
  </defs>

  <rect width="${W}" height="${H}" fill="${CHARCOAL}"/>

  <!-- Warm light behind the mark, so the banner isn't a flat black bar. -->
  <ellipse cx="${ICON_X + ICON / 2}" cy="${H / 2}" rx="300" ry="230"
           fill="${BRAND}" opacity="0.34" filter="url(#glow)"/>
  <ellipse cx="${W - 120}" cy="${H + 40}" rx="340" ry="200"
           fill="${BRAND}" opacity="0.18" filter="url(#glow)"/>

  <text xml:space="preserve" x="${TEXT_X}" y="248"
        font-family="Segoe UI, Helvetica, Arial, sans-serif"
        font-size="104" font-weight="700" letter-spacing="-3" fill="#fffbf7">Plinth</text>

  <text xml:space="preserve" x="${TEXT_X + 4}" y="318"
        font-family="Segoe UI, Helvetica, Arial, sans-serif"
        font-size="40" font-weight="400" fill="#d6d3d1">Find it. Plan it. Shop it.</text>

  <rect x="${TEXT_X + 4}" y="352" width="96" height="6" rx="3" fill="${BRAND}"/>
</svg>`;

(async () => {
  // Mask the icon to its own rounded shape. The PNG already has transparent
  // corners, but re-masking guarantees the radius matches the shadow tile below
  // it — mismatched radii are what made the mark read as a plain square.
  const mask = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${ICON}" height="${ICON}">
       <rect width="${ICON}" height="${ICON}" rx="${ICON_RADIUS}" fill="#fff"/>
     </svg>`,
  );

  const icon = await sharp(path.join(__dirname, '..', 'assets', 'images', 'icon.png'))
    .resize(ICON, ICON)
    .composite([{ input: mask, blend: 'dest-in' }])
    .png()
    .toBuffer();

  // Shadow only — the tile itself is transparent, so it can't square off the
  // icon's corners. sharp composites flat bitmaps with no filter chain, so this
  // is rendered as its own layer rather than as a filter on the composite.
  const shadow = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
       <defs>
         <filter id="d" x="-50%" y="-50%" width="200%" height="200%">
           <feGaussianBlur stdDeviation="22"/>
         </filter>
       </defs>
       <rect x="${ICON_X}" y="${ICON_Y + 16}" width="${ICON}" height="${ICON}"
             rx="${ICON_RADIUS}" fill="#000" opacity="0.5" filter="url(#d)"/>
     </svg>`,
  );

  const out = path.join(__dirname, 'out', 'feature-graphic-1024x500.png');
  await sharp(Buffer.from(svg))
    .composite([
      { input: shadow, left: 0, top: 0 },
      { input: icon, left: ICON_X, top: Math.round(ICON_Y) },
    ])
    .png()
    .toFile(out);

  console.log('wrote', path.relative(process.cwd(), out));
})();
