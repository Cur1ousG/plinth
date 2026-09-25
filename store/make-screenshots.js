/**
 * Builds Play Store screenshot images: a headline, a subtitle, and a framed
 * phone mockup on a branded background.
 *
 * Drop raw device screenshots into store/shots/ named 01.png, 02.png, ... to
 * match the SHOTS order below, then:
 *
 *   node store/make-screenshots.js
 *
 * Output lands in store/out/ at 1080x1920, which is what Play wants for phone
 * screenshots. A missing input file renders as an empty phone so the layout can
 * still be reviewed before the real captures exist.
 */

const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

/**
 * Output size. Play wants 1080x1920; the App Store's required iPhone size is
 * 6.9" at 1290x2796, which is both larger and a taller aspect. Everything below
 * is expressed as a fraction of the canvas rather than in fixed pixels, so the
 * same layout composes at either size.
 *
 *   node store/make-screenshots.js         → Play, into store/out/
 *   node store/make-screenshots.js ios     → App Store, into store/out-ios/
 */
const TARGETS = {
  play: { w: 1080, h: 1920, dir: "out", suffix: "play", shots: "shots", frameAspect: 2.0 },
  ios: { w: 1290, h: 2796, dir: "out-ios", suffix: "ios", shots: "shots-ios", frameAspect: 2.0 },
  // 13-inch iPad. Required once app.json sets supportsTablet.
  ipad: { w: 2064, h: 2752, dir: "out-ipad", suffix: "ipad", shots: "shots-ipad", frameAspect: 1.4 },
};

const TARGET = TARGETS[process.argv[2]] ?? TARGETS.play;
const CANVAS = { w: TARGET.w, h: TARGET.h };

const SCALE = CANVAS.w / 1080;
const px = (n) => Math.round(n * SCALE);

const BRAND = "#ea580c";
const CREAM = "#fffbf7";
const CHARCOAL = "#12100e";

/**
 * One entry per screenshot. `*word*` renders italic in the accent colour —
 * that emphasis is what stops a wall of bold text reading as a banner ad.
 *
 * Order matters: Play shows these left to right, and the first two are the only
 * ones most people see, so the strongest claims go first.
 */
const SHOTS = [
  {
    file: "01-home.png",
    line1: "Dinner, decided",
    line2: "*before* you ask",
    sub: "A pick for today, and what's trending, on open.",
    theme: "light",
  },
  {
    file: "02-discover.png",
    line1: "Import a recipe",
    line2: "from *anywhere*",
    sub: "Paste a link or a reel caption. Get a real recipe.",
    theme: "dark",
  },
  {
    file: "03-recipe.png",
    line1: "Tick, then",
    line2: "*straight* to the list",
    sub: "Check off what you have. Send the rest to your cart.",
    theme: "light",
  },
  {
    file: "04-planner.png",
    line1: "Plan the week",
    line2: "*in minutes*",
    sub: "Breakfast, lunch and dinner, sorted before Monday.",
    theme: "dark",
  },
  {
    file: "05-cart.png",
    line1: "A list that",
    line2: "*sorts itself*",
    sub: "Grouped by aisle, so you walk the shop once.",
    theme: "light",
  },
  {
    // Swap back to a full-screen capture of the invite sheet when there is one:
    // "share it with the whole house" is the feature competitors don't have.
    file: "06-cuisine.png",
    line1: "Cook the world",
    line2: "on a *Tuesday*",
    sub: "Browse by cuisine and country, from Italian to Japanese.",
    theme: "dark",
  },
  {
    file: "07-dietitian.png",
    line1: "Targets that fit",
    line2: "*your* goal",
    sub: "Calories and protein, with recipes that match.",
    theme: "light",
  },
  {
    file: "08-preferences.png",
    line1: "Allergies handled",
    line2: "*properly*",
    sub: "Excluded entirely, not just ranked lower.",
    theme: "dark",
  },
];

const esc = (s) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Turn "that *sorts itself*" into tspans, accent segments italic + coloured. */
function tspans(text, fill, accent) {
  return text
    .split(/(\*[^*]+\*)/)
    .filter(Boolean)
    .map((part) => {
      if (part.startsWith("*") && part.endsWith("*")) {
        const inner = esc(part.slice(1, -1));
        return `<tspan fill="${accent}" font-style="italic">${inner}</tspan>`;
      }
      return `<tspan fill="${fill}">${esc(part)}</tspan>`;
    })
    .join("");
}

function backdrop(theme) {
  const bg = theme === "dark" ? CHARCOAL : CREAM;
  // A soft brand-tinted glow behind the phone, so the mockup doesn't float on
  // flat colour. Subtle on cream, stronger on charcoal where it reads as light.
  const glowOpacity = theme === "dark" ? 0.26 : 0.16;
  return `
    <rect width="${CANVAS.w}" height="${CANVAS.h}" fill="${bg}"/>
    <ellipse cx="${CANVAS.w / 2}" cy="${CANVAS.h * 0.72}" rx="${CANVAS.w * 0.78}" ry="${CANVAS.h * 0.34}"
             fill="${BRAND}" opacity="${glowOpacity}" filter="url(#soft)"/>`;
}

function textLayer(shot) {
  const light = shot.theme !== "dark";
  const fg = light ? "#1c1917" : "#fafaf9";
  const subFg = light ? "#78716c" : "#a8a29e";
  const accent = light ? BRAND : "#fb923c"; // lighter accent holds up on charcoal

  return `
    <text xml:space="preserve" x="${CANVAS.w / 2}" y="${px(250)}" text-anchor="middle"
          font-family="Segoe UI, Helvetica, Arial, sans-serif"
          font-size="${px(94)}" font-weight="700" letter-spacing="${-px(2)}">
      ${tspans(shot.line1, fg, accent)}
    </text>
    <text xml:space="preserve" x="${CANVAS.w / 2}" y="${px(368)}" text-anchor="middle"
          font-family="Segoe UI, Helvetica, Arial, sans-serif"
          font-size="${px(94)}" font-weight="700" letter-spacing="${-px(2)}">
      ${tspans(shot.line2, fg, accent)}
    </text>
    <text xml:space="preserve" x="${CANVAS.w / 2}" y="${px(452)}" text-anchor="middle"
          font-family="Segoe UI, Helvetica, Arial, sans-serif"
          font-size="${px(38)}" font-weight="400" fill="${subFg}">
      ${esc(shot.sub)}
    </text>`;
}

// Phone geometry. The frame runs off the bottom edge, which is what makes the
// reference listings read as a product shot rather than a boxed thumbnail.
const BEZEL = px(14);

/**
 * The frame's proportions follow the canvas, not a fixed pixel size.
 *
 * Scaling width and height independently was wrong: the App Store canvas is a
 * taller aspect than Play's, which made the frame proportionally narrow and
 * cropped 18% off the sides of every screenshot. So the height is what the
 * canvas dictates — top at 29%, running off the bottom edge — and the width is
 * derived from it at roughly a phone's own aspect, which is what the sources
 * are. The cap stops it growing into the margins on a very tall canvas.
 */
// Below the text, always. The headline positions scale with canvas width while
// this scales with height, so on a squarer canvas — the iPad — 29% put the
// frame on top of the subtitle and hid it completely.
const PHONE_TOP = Math.max(Math.round(CANVAS.h * 0.29), px(452) + px(115));
const PHONE_H = CANVAS.h - PHONE_TOP + px(120);
const PHONE_INNER_H = PHONE_H - BEZEL * 2;
const PHONE_INNER_W = Math.min(
  Math.round(PHONE_INNER_H / TARGET.frameAspect),
  Math.round(CANVAS.w * 0.8),
);

const PHONE = {
  w: PHONE_INNER_W + BEZEL * 2,
  x: Math.round((CANVAS.w - (PHONE_INNER_W + BEZEL * 2)) / 2),
  y: PHONE_TOP,
  h: PHONE_H,
  radius: px(62),
};

function phoneFrame(theme) {
  const frameFill = theme === "dark" ? "#000000" : "#1c1917";
  return `
    <rect x="${PHONE.x}" y="${PHONE.y}" width="${PHONE.w}" height="${PHONE.h}"
          rx="${PHONE.radius}" fill="${frameFill}" filter="url(#drop)"/>`;
}

async function screenInner(file, trimTop) {
  const innerW = PHONE.w - BEZEL * 2;
  const innerH = PHONE.h - BEZEL * 2;
  const src = path.join(__dirname, TARGET.shots, file);

  if (!fs.existsSync(src)) {
    // Placeholder so the layout is reviewable before real captures exist.
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${innerW}" height="${innerH}">
        <rect width="${innerW}" height="${innerH}" fill="#292524"/>
        <text x="${innerW / 2}" y="${innerH / 2}" text-anchor="middle"
              font-family="Segoe UI, Arial, sans-serif" font-size="34" fill="#78716c">
          ${esc(file)} — drop it in store/${TARGET.shots}/
        </text>
      </svg>`;
    return sharp(Buffer.from(svg)).png().toBuffer();
  }

  // Cover-fit and anchor to the top: the status bar and header are the part of
  // a screenshot worth showing, and the bottom is what the frame crops anyway.
  //
  // Cover only flatters a source at least as tall, proportionally, as the frame.
  // Feed it a cropped sheet and it zooms until the sides fall off the edges —
  // silently, which is worse than failing, so say so.
  const meta = await sharp(src).metadata();
  const frameAspect = innerH / innerW;
  const srcAspect = meta.height / meta.width;
  if (srcAspect < frameAspect * 0.9) {
    console.warn(
      `  ! ${file} is ${meta.width}x${meta.height} — too short for the frame; ` +
        `it will be zoomed ${(innerW / meta.width).toFixed(1)}x and cropped at the sides. ` +
        `Recapture it full-screen.`,
    );
  } else if (meta.width < 700) {
    console.warn(
      `  ! ${file} is only ${meta.width}px wide; upscaling to ${innerW}px will look soft. ` +
        `A native device capture (1080px+) would be sharper.`,
    );
  }

  // `trimTop` (a fraction of source height) exists for captures that include the
  // device status bar — the clock, the battery and whatever notification icons
  // were up are not the app, and a 2% battery reads as carelessness. The current
  // captures arrive already trimmed, so it defaults to nothing: cropping blind
  // ate the nav bar on the screens whose header sits highest.
  const bar = Math.round(meta.height * (trimTop || 0));

  const pipeline = sharp(src);
  if (bar > 0) {
    pipeline.extract({
      left: 0,
      top: bar,
      width: meta.width,
      height: meta.height - bar,
    });
  }

  return pipeline
    .resize(innerW, innerH, { fit: "cover", position: "top" })
    .png()
    .toBuffer();
}

/** Round the screen's top corners so it sits inside the bezel cleanly. */
async function roundedScreen(buf) {
  const innerW = PHONE.w - BEZEL * 2;
  const innerH = PHONE.h - BEZEL * 2;
  const mask = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${innerW}" height="${innerH}">
       <rect width="${innerW}" height="${innerH}" rx="${PHONE.radius - BEZEL}" fill="#fff"/>
     </svg>`,
  );
  return sharp(buf)
    .composite([{ input: mask, blend: "dest-in" }])
    .png()
    .toBuffer();
}

async function build(shot, index) {
  const base = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${CANVAS.w}" height="${CANVAS.h}">
      <defs>
        <filter id="soft" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="120"/>
        </filter>
        <filter id="drop" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="26" stdDeviation="34" flood-opacity="0.34"/>
        </filter>
      </defs>
      ${backdrop(shot.theme)}
      ${textLayer(shot)}
      ${phoneFrame(shot.theme)}
    </svg>`;

  const screen = await roundedScreen(
    await screenInner(shot.file, shot.trimTop),
  );

  const outDir = path.join(__dirname, TARGET.dir);
  fs.mkdirSync(outDir, { recursive: true });
  const out = path.join(
    outDir,
    `${String(index + 1).padStart(2, "0")}-${TARGET.suffix}.png`,
  );

  await sharp(Buffer.from(base))
    .composite([{ input: screen, left: PHONE.x + BEZEL, top: PHONE.y + BEZEL }])
    .png()
    .toFile(out);

  return out;
}

(async () => {
  for (const [i, shot] of SHOTS.entries()) {
    const out = await build(shot, i);
    const have = fs.existsSync(path.join(__dirname, "shots", shot.file));
    console.log(
      `${path.basename(out)}  ${have ? "with " + shot.file : "PLACEHOLDER"}`,
    );
  }
})();
