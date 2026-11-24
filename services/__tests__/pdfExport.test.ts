import { describe, it, expect, vi, afterEach } from 'vitest';
import { normalizeColorValue, normalizeColorsForPdf } from '../pdfExport';

/** Minimal canvas 2D stub: modern colors are returned as rgb(), others keep the sentinel. */
function createCtx(): CanvasRenderingContext2D {
  let current = '#000000';
  return {
    get fillStyle() { return current; },
    set fillStyle(value: string) {
      if (/^oklch\(/i.test(value)) current = 'rgb(1, 2, 3)';
      else if (/^oklab\(/i.test(value)) current = 'rgba(4, 5, 6, 0.5)';
      else if (/^#[0-9a-f]{6}$/i.test(value)) current = value;
    },
  } as unknown as CanvasRenderingContext2D;
}

describe('pdfExport color normalization', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('converts oklch colors to rgb', () => {
    expect(normalizeColorValue(createCtx(), 'oklch(55.1% 0.027 264.364)')).toBe('rgb(1, 2, 3)');
  });

  it('converts every modern color inside a gradient', () => {
    const value = 'linear-gradient(oklch(0.5 0 0), oklab(0.7 0 0))';
    expect(normalizeColorValue(createCtx(), value))
      .toBe('linear-gradient(rgb(1, 2, 3), rgba(4, 5, 6, 0.5))');
  });

  it('leaves standard colors untouched', () => {
    expect(normalizeColorValue(createCtx(), '#ffffff')).toBe('#ffffff');
    expect(normalizeColorValue(createCtx(), 'rgb(0, 0, 0)')).toBe('rgb(0, 0, 0)');
  });

  it('writes normalized inline styles on the cloned document', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(createCtx());

    const doc = document;
    const element = doc.createElement('div');
    doc.body.appendChild(element);
    vi.spyOn(window, 'getComputedStyle').mockReturnValue({
      color: 'oklch(0.5 0 0)',
      backgroundColor: '#ffffff',
    } as CSSStyleDeclaration);

    normalizeColorsForPdf(doc);

    expect(element.style.color).toBe('rgb(1, 2, 3)');
    expect(element.style.backgroundColor).toBe('');
  });
});
