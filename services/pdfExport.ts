/**
 * html2canvas (used by html2pdf.js) can only parse rgb()/hsl()/hex colors.
 * Tailwind v4 emits oklch()/oklab()/color(), which makes the PDF export throw
 * `Attempting to parse an unsupported color function "oklch"` and abort the
 * download.
 *
 * html2canvas renders a clone of the document, so this helper walks that
 * clone in the `onclone` hook and rewrites every modern color to plain rgb().
 * Conversion is done with pure math instead of canvas.fillStyle because some
 * browsers serialize oklch() back as oklch(), leaving the error in place.
 */

const COLOR_PROPERTIES = [
  'color',
  'backgroundColor',
  'backgroundImage',
  'borderColor',
  'borderTopColor',
  'borderRightColor',
  'borderBottomColor',
  'borderLeftColor',
  'borderImage',
  'outlineColor',
  'boxShadow',
  'textShadow',
  'textDecorationColor',
  'textEmphasisColor',
  'webkitTextStrokeColor',
  'listStyleImage',
  'fill',
  'stroke',
  'stopColor',
] as const;

const MODERN_COLOR = /\b(oklch|oklab|lab|lch|color)\(([^()]*)\)/gi;
const HAS_MODERN_COLOR = /\b(?:oklch|oklab|lab|lch|color|color-mix)\(/i;

const FALLBACKS: Partial<Record<(typeof COLOR_PROPERTIES)[number], string>> = {
  color: '#1f2937',
  fill: '#1f2937',
  stroke: '#1f2937',
  stopColor: '#1f2937',
  textDecorationColor: '#1f2937',
  textEmphasisColor: '#1f2937',
  webkitTextStrokeColor: '#1f2937',
  listStyleImage: 'none',
  backgroundColor: 'transparent',
  outlineColor: 'transparent',
  backgroundImage: 'none',
  borderImage: 'none',
  boxShadow: 'none',
  textShadow: 'none',
  borderColor: '#d1d5db',
  borderTopColor: '#d1d5db',
  borderRightColor: '#d1d5db',
  borderBottomColor: '#d1d5db',
  borderLeftColor: '#d1d5db',
};

const num = (value: string | undefined, fallback = 0): number => {
  const parsed = parseFloat(value || '');
  return Number.isFinite(parsed) ? parsed : fallback;
};

/** Percentages are relative to the CSS range of each component. */
const component = (token: string | undefined, percentScale = 1): number =>
  token?.trim().endsWith('%')
    ? (num(token) / 100) * percentScale
    : num(token);

const angle = (token: string | undefined): number => {
  const value = token || '';
  const degrees = num(value);
  if (/rad/i.test(value)) return (degrees * 180) / Math.PI;
  if (/grad/i.test(value)) return degrees * 0.9;
  if (/turn/i.test(value)) return degrees * 360;
  return degrees;
};

const clamp255 = (value: number): number =>
  Math.round(Math.min(1, Math.max(0, value)) * 255);

/** Linear-light sRGB channel to gamma-encoded 0..1 channel. */
const encode = (value: number): number => {
  const encoded = value <= 0.0031308
    ? value * 12.92
    : 1.055 * Math.pow(Math.max(0, value), 1 / 2.4) - 0.055;
  return Math.min(1, Math.max(0, encoded));
};

function toCss(r: number, g: number, b: number, alpha: number): string {
  const channels = `${clamp255(r)}, ${clamp255(g)}, ${clamp255(b)}`;
  return alpha >= 1 ? `rgb(${channels})` : `rgba(${channels}, ${Number(alpha.toFixed(4))})`;
}

/** OKLab (L, a, b) to gamma-encoded sRGB using the standard matrices. */
function oklabToCss(L: number, a: number, b: number, alpha: number): string {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.2914855480 * b;
  const l = l_ ** 3;
  const m = m_ ** 3;
  const s = s_ ** 3;

  return toCss(
    encode(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    encode(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    encode(-0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s),
    alpha,
  );
}

/** CIELAB (D65) to gamma-encoded sRGB. */
function labToCss(L: number, a: number, b: number, alpha: number): string {
  const fy = (L + 16) / 116;
  const fx = fy + a / 500;
  const fz = fy - b / 200;
  const x = fx ** 3 > 0.008856 ? fx ** 3 : (fx - 16 / 116) / 7.787;
  const y = L > 8 ? fy ** 3 : L / 903.3;
  const z = fz ** 3 > 0.008856 ? fz ** 3 : (fz - 16 / 116) / 7.787;

  return toCss(
    encode(3.2409699419 * x - 1.5373831776 * y - 0.4986107603 * z),
    encode(-0.9692436363 * x + 1.8759675015 * y + 0.0415550574 * z),
    encode(0.0556300797 * x - 0.2039769589 * y + 1.0569715142 * z),
    alpha,
  );
}

function splitAlpha(inner: string): { parts: string[]; alpha: number } {
  const [main, alphaToken] = inner.split('/');
  return {
    parts: main.trim().split(/\s+/).filter(Boolean),
    alpha: alphaToken === undefined ? 1 : component(alphaToken, 1),
  };
}

function convertColorFunction(name: string, inner: string): string | null {
  const { parts, alpha } = splitAlpha(inner);

  switch (name.toLowerCase()) {
    case 'oklch': {
      const L = component(parts[0]);
      const C = component(parts[1], 0.4);
      const h = angle(parts[2]) * (Math.PI / 180);
      return oklabToCss(L, C * Math.cos(h), C * Math.sin(h), alpha);
    }
    case 'oklab':
      return oklabToCss(component(parts[0]), component(parts[1], 0.4), component(parts[2], 0.4), alpha);
    case 'lch': {
      const L = component(parts[0], 100);
      const C = component(parts[1], 125);
      const h = angle(parts[2]) * (Math.PI / 180);
      return labToCss(L, C * Math.cos(h), C * Math.sin(h), alpha);
    }
    case 'lab':
      return labToCss(component(parts[0], 100), component(parts[1], 125), component(parts[2], 125), alpha);
    case 'color': {
      const space = (parts[0] || '').toLowerCase();
      const channels = parts.slice(1);
      if (!['srgb', 'srgb-linear', 'display-p3'].includes(space) || channels.length < 3) return null;

      const p3 = channels.map(token => component(token, 1));
      if (space === 'display-p3') {
        const [r, g, b] = p3;
        return toCss(
          encode(1.2249402 * r - 0.2249401 * g),
          encode(-0.0420569 * r + 1.0420569 * g),
          encode(-0.0196376 * g + 1.0196376 * b),
          alpha,
        );
      }
      if (space === 'srgb-linear') {
        return toCss(encode(p3[0]), encode(p3[1]), encode(p3[2]), alpha);
      }
      return toCss(p3[0], p3[1], p3[2], alpha);
    }
    default:
      return null;
  }
}

/** Replaces every modern color function (also nested ones) with rgb()/rgba(). */
export function normalizeColorValue(value: string): string {
  let result = value;
  for (let pass = 0; pass < 5 && HAS_MODERN_COLOR.test(result); pass++) {
    const next = result.replace(MODERN_COLOR, (match, name: string, inner: string) =>
      convertColorFunction(name, inner) ?? match);
    if (next === result) break;
    result = next;
  }
  return result;
}

/** Rewrites the inline styles of html2canvas' cloned document. */
export function normalizeColorsForPdf(clonedDoc: Document): void {
  clonedDoc.querySelectorAll<HTMLElement>('*').forEach(element => {
    const computed = clonedDoc.defaultView?.getComputedStyle(element);
    if (!computed) return;

    const style = element.style as unknown as Record<string, string>;
    const values = computed as unknown as Record<string, string>;

    COLOR_PROPERTIES.forEach(property => {
      try {
        const value = values[property];
        if (!value || !HAS_MODERN_COLOR.test(value)) return;

        const normalized = normalizeColorValue(value);
        // If anything remains unsupported, drop the declaration instead of
        // letting html2canvas crash the whole export.
        style[property] = HAS_MODERN_COLOR.test(normalized)
          ? FALLBACKS[property] ?? 'transparent'
          : normalized;
      } catch {
        // Never let one odd element abort the onclone hook.
      }
    });
  });
}
