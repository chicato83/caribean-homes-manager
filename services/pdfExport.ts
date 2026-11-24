/**
 * html2canvas (used by html2pdf.js) cannot parse the modern color functions
 * emitted by Tailwind v4 (oklch, oklab, color-mix, color(srgb ...)). When it
 * finds one it throws and the download silently never happens.
 *
 * html2canvas renders a *clone* of the document, so this helper walks that
 * clone in the `onclone` hook and converts every unsupported color to plain
 * rgb()/rgba() before rendering. The browser's canvas 2D context is used as
 * the converter because it understands modern CSS colors natively.
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
  'fill',
  'stroke',
  'stopColor',
] as const;

const SENTINEL = '#010203';
const UNSUPPORTED_COLOR = /\b(?:oklch|oklab|lab|lch|color)\([^()]*\)/gi;

type Context2D = Pick<CanvasRenderingContext2D, 'fillStyle'>;

/** Asks the browser to serialize a CSS color as rgb()/rgba(). */
function toSupportedColor(ctx: Context2D, token: string): string {
  ctx.fillStyle = SENTINEL;
  ctx.fillStyle = token;
  const converted = String(ctx.fillStyle);
  // fillStyle keeps its previous value when it cannot parse a color.
  return converted === SENTINEL ? token : converted;
}

export function normalizeColorValue(ctx: Context2D, value: string): string {
  if (!value || !UNSUPPORTED_COLOR.test(value)) return value;
  UNSUPPORTED_COLOR.lastIndex = 0;

  // Whole values (e.g. color-mix) are often understood by canvas directly.
  const whole = toSupportedColor(ctx, value);
  if (whole !== value) return whole;

  // Gradients/shadows contain several colors: replace each one individually.
  return value.replace(UNSUPPORTED_COLOR, token => toSupportedColor(ctx, token));
}

export function normalizeColorsForPdf(clonedDoc: Document): void {
  const ctx = clonedDoc.createElement('canvas').getContext('2d') as Context2D | null;
  if (!ctx) return;

  clonedDoc.querySelectorAll<HTMLElement>('*').forEach(element => {
    const computed = clonedDoc.defaultView?.getComputedStyle(element);
    if (!computed) return;

    const style = element.style as unknown as Record<string, string>;
    const values = computed as unknown as Record<string, string>;

    COLOR_PROPERTIES.forEach(property => {
      const value = values[property];
      if (!value || !UNSUPPORTED_COLOR.test(value)) return;
      UNSUPPORTED_COLOR.lastIndex = 0;
      style[property] = normalizeColorValue(ctx, value);
    });
  });
}
