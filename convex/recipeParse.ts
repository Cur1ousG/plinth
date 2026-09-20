/**
 * Turning someone else's page — or a pasted caption — into a Plinth recipe.
 *
 * Pure functions only: no fetching, no auth, no database. That keeps the messy
 * part (every recipe site formats things differently) separate from the part
 * that has to be careful (see importRecipe.ts, which does the fetching).
 */

export type ParsedIngredient = {
  name?: string;
  amount?: number;
  unit?: string;
  original: string;
};

export type ParsedRecipeDraft = {
  title: string;
  thumbnail?: string;
  siteName?: string;
  url?: string;
  ingredients: ParsedIngredient[];
  instructions?: string;
  totalTime?: string;
  yields?: string;
  /** How much of this we actually found, so the UI can nudge toward editing. */
  confidence: 'high' | 'partial';
};

// ---------------------------------------------------------------------------
// JSON-LD — the happy path
// ---------------------------------------------------------------------------

/**
 * Most recipe sites publish schema.org Recipe as JSON-LD, because that's what
 * gets them the rich result in Google. It's the same data the site renders, in
 * a form we don't have to guess at, so we try it before anything else.
 */
export function parseJsonLd(html: string, url?: string): ParsedRecipeDraft | null {
  for (const block of extractJsonLdBlocks(html)) {
    const recipe = findRecipeNode(block);
    if (recipe) return fromSchemaRecipe(recipe, url);
  }
  return null;
}

function extractJsonLdBlocks(html: string): unknown[] {
  const out: unknown[] = [];
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    try {
      // Some sites emit raw newlines inside strings, which is invalid JSON.
      out.push(JSON.parse(m[1].trim().replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, ' ')));
    } catch {
      // A malformed block isn't fatal — a page often has several.
    }
  }
  return out;
}

/** Recipe nodes hide inside @graph arrays, plain arrays, or sit at the root. */
function findRecipeNode(node: unknown, depth = 0): Record<string, unknown> | null {
  if (depth > 6 || node === null || typeof node !== 'object') return null;

  if (Array.isArray(node)) {
    for (const item of node) {
      const found = findRecipeNode(item, depth + 1);
      if (found) return found;
    }
    return null;
  }

  const obj = node as Record<string, unknown>;
  const type = obj['@type'];
  const isRecipe = Array.isArray(type)
    ? type.some((t) => String(t).toLowerCase() === 'recipe')
    : String(type ?? '').toLowerCase() === 'recipe';
  if (isRecipe) return obj;

  if ('@graph' in obj) return findRecipeNode(obj['@graph'], depth + 1);
  return null;
}

function fromSchemaRecipe(r: Record<string, unknown>, url?: string): ParsedRecipeDraft {
  const ingredients = asStringArray(r.recipeIngredient).map(parseIngredientLine);
  const instructions = instructionsToText(r.recipeInstructions);

  return {
    title: firstString(r.name) ?? 'Untitled recipe',
    thumbnail: pickImage(r.image),
    siteName: publisherName(r) ?? (url ? hostLabel(url) : undefined),
    url: firstString(r.url) ?? url,
    ingredients,
    instructions,
    totalTime: formatDuration(firstString(r.totalTime) ?? firstString(r.cookTime)),
    yields: firstString(r.recipeYield) ?? undefined,
    confidence: ingredients.length > 0 && instructions ? 'high' : 'partial',
  };
}

// ---------------------------------------------------------------------------
// Pasted text — for Instagram captions and anything else without structure
// ---------------------------------------------------------------------------

const INGREDIENT_HEADING = /^\s*(ingredients?|you'?ll need|what you need)\s*:?\s*$/i;
const METHOD_HEADING = /^\s*(method|instructions?|directions?|steps?|how to)\s*:?\s*$/i;
const MEASURE =
  /^\s*[-•*–]?\s*(\d+[\d/.,\s]*)?\s*(cups?|tbsps?|tablespoons?|tsps?|teaspoons?|g|kg|ml|l|oz|lbs?|pounds?|cloves?|pinch|handful|cans?|tins?|slices?)\b/i;
const LEADING_QTY = /^\s*[-•*–]?\s*\d/;
/** A line that is nothing but hashtags (and maybe emoji). */
const HASHTAG_ONLY = /^(?:\s*#[\w]+)+\s*$/;

/**
 * Captions have no structure to lean on, so this works off shape: a heading if
 * there is one, otherwise lines that look like quantities. It is deliberately
 * generous about what counts as an ingredient — the import screen shows the
 * result for editing before anything is saved, so a wrong guess costs a tap,
 * while a missed line costs retyping.
 */
export function parsePastedText(text: string, sourceLabel?: string): ParsedRecipeDraft {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.replace(/\s+/g, ' ').trim())
    .filter(Boolean);

  const ingredientLines: string[] = [];
  const methodLines: string[] = [];
  let section: 'none' | 'ingredients' | 'method' = 'none';

  for (const line of lines) {
    // Captions almost always end in a wall of hashtags. Left alone it reads as
    // a final cooking step, which is the first thing anyone would notice.
    if (HASHTAG_ONLY.test(line)) continue;

    if (INGREDIENT_HEADING.test(line)) {
      section = 'ingredients';
      continue;
    }
    if (METHOD_HEADING.test(line)) {
      section = 'method';
      continue;
    }

    if (section === 'ingredients') {
      ingredientLines.push(line);
    } else if (section === 'method') {
      methodLines.push(line);
    } else if (MEASURE.test(line) || LEADING_QTY.test(line)) {
      // No headings at all — fall back to shape.
      ingredientLines.push(line);
    } else if (ingredientLines.length > 0) {
      methodLines.push(line);
    }
  }

  const title = deriveTitle(lines);

  return {
    title,
    siteName: sourceLabel,
    ingredients: ingredientLines.map(stripBullet).map(parseIngredientLine),
    instructions: methodLines.length ? methodLines.join('\n\n') : undefined,
    // Captions rarely give a clean result, so always invite a look before saving.
    confidence: 'partial',
  };
}

/** First line that reads like a name rather than a quantity or a hashtag wall. */
function deriveTitle(lines: string[]): string {
  for (const line of lines) {
    const clean = line.replace(/#[\w]+/g, '').trim();
    if (!clean || clean.length > 80) continue;
    if (MEASURE.test(clean) || LEADING_QTY.test(clean)) continue;
    if (INGREDIENT_HEADING.test(clean) || METHOD_HEADING.test(clean)) continue;
    return stripEmoji(clean);
  }
  return 'Imported recipe';
}

// ---------------------------------------------------------------------------
// Shared bits
// ---------------------------------------------------------------------------

const FRACTIONS: Record<string, number> = {
  '½': 0.5, '¼': 0.25, '¾': 0.75, '⅓': 1 / 3, '⅔': 2 / 3, '⅛': 0.125,
};

/** "2 tbsp soy sauce" → { amount: 2, unit: 'tbsp', name: 'soy sauce' }. */
export function parseIngredientLine(line: string): ParsedIngredient {
  const original = line.trim();
  const m = original.match(
    /^(\d+\s+\d+\/\d+|\d+\/\d+|[½¼¾⅓⅔⅛]|\d+(?:[.,]\d+)?)?\s*([a-zA-Z]+)?\s*(.*)$/,
  );
  if (!m) return { original };

  const [, rawAmount, rawUnit, rest] = m;
  const amount = rawAmount ? toNumber(rawAmount) : undefined;
  const unit = rawUnit && MEASURE.test(`1 ${rawUnit}`) ? rawUnit.toLowerCase() : undefined;
  // When the word after the quantity isn't a unit it's part of the name, so it
  // gets joined back on — without a space if the rest opens with punctuation,
  // or "2 boneless, skinless chicken" comes back as "boneless , skinless".
  const name =
    (unit ? rest : joinNamePart(rawUnit, rest)).trim() || undefined;

  return { original, amount, unit, name };
}

function joinNamePart(head?: string, tail?: string): string {
  if (!head) return tail ?? '';
  if (!tail) return head;
  return /^[,.;:)]/.test(tail) ? head + tail : `${head} ${tail}`;
}

function toNumber(s: string): number | undefined {
  if (FRACTIONS[s] != null) return FRACTIONS[s];
  if (s.includes('/')) {
    const [whole, frac] = s.trim().split(/\s+/);
    const parts = (frac ?? whole).split('/');
    const value = Number(parts[0]) / Number(parts[1]);
    return frac ? Number(whole) + value : value;
  }
  const n = Number(s.replace(',', '.'));
  return Number.isFinite(n) ? n : undefined;
}

function stripBullet(s: string): string {
  return s.replace(/^\s*[-•*–]\s*/, '');
}

function stripEmoji(s: string): string {
  return s.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '').trim();
}

function asStringArray(v: unknown): string[] {
  if (Array.isArray(v)) return v.map((x) => firstString(x)).filter((x): x is string => !!x);
  const s = firstString(v);
  return s ? [s] : [];
}

function firstString(v: unknown): string | undefined {
  if (typeof v === 'string') return decodeEntities(v.trim()) || undefined;
  if (typeof v === 'number') return String(v);
  if (Array.isArray(v)) return firstString(v[0]);
  if (v && typeof v === 'object') {
    const o = v as Record<string, unknown>;
    return firstString(o.name ?? o['@value'] ?? o.text ?? o.url);
  }
  return undefined;
}

/** Instructions come as a string, a list of steps, or nested HowToSections. */
function instructionsToText(v: unknown): string | undefined {
  if (!v) return undefined;
  if (typeof v === 'string') return stripTags(decodeEntities(v)) || undefined;

  if (Array.isArray(v)) {
    const steps: string[] = [];
    for (const item of v) {
      if (item && typeof item === 'object') {
        const o = item as Record<string, unknown>;
        if (String(o['@type'] ?? '').toLowerCase() === 'howtosection') {
          const inner = instructionsToText(o.itemListElement);
          if (inner) steps.push(inner);
          continue;
        }
      }
      const s = firstString(item);
      if (s) steps.push(stripTags(s));
    }
    return steps.length ? steps.join('\n\n') : undefined;
  }

  const s = firstString(v);
  return s ? stripTags(s) : undefined;
}

function pickImage(v: unknown): string | undefined {
  const s = firstString(v);
  return s && /^https?:\/\//i.test(s) ? s : undefined;
}

function publisherName(r: Record<string, unknown>): string | undefined {
  return firstString(r.publisher) ?? firstString(r.author);
}

export function hostLabel(url: string): string | undefined {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return undefined;
  }
}

/** ISO 8601 durations ("PT1H30M") are what schema.org uses. */
function formatDuration(iso?: string): string | undefined {
  if (!iso) return undefined;
  const m = iso.match(/^PT(?:(\d+)H)?(?:(\d+)M)?$/i);
  if (!m) return iso;
  const h = Number(m[1] ?? 0);
  const min = Number(m[2] ?? 0);
  if (!h && !min) return undefined;
  return h ? `${h} hr${min ? ` ${min} min` : ''}` : `${min} min`;
}

function stripTags(s: string): string {
  return decodeEntities(s.replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&nbsp;/g, ' ');
}
