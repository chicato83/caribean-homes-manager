import { describe, it, expect, vi, afterEach } from 'vitest';
import { normalizeColorValue, normalizeColorsForPdf } from '../pdfExport';

function channels(value: string): number[] {
  const match = /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i.exec(value);
  if (!match) throw new Error(`Expected an rgb color, got: ${value}`);
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

function expectClose(actual: number[], expected: number[], tolerance = 4): void {
  actual.forEach((channel, index) => {
    expect(Math.abs(channel - expected[index])).toBeLessThanOrEqual(tolerance);
  });
}

describe('pdfExport color normalization', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  it('converts Tailwind v4 oklch colors back to their sRGB equivalents', () => {
    // Expected values are the sRGB fallbacks published with Tailwind v4's palette.
    const cases: [string, number[]][] = [
      ['oklch(55.1% .027 264.364)', [106, 114, 130]],   // gray-500
      ['oklch(27.8% .033 256.848)', [30, 41, 57]],      // gray-800
      ['oklch(98.2% .018 155.826)', [240, 253, 244]],   // green-50
      ['oklch(62.7% .194 149.214)', [0, 166, 62]],      // green-600
      ['oklch(54.6% .245 262.881)', [21, 93, 252]],     // blue-600
      ['oklch(57.7% .245 27.325)', [231, 0, 11]],       // red-600
      ['oklch(1 0 0)', [255, 255, 255]],
    ];

    cases.forEach(([value, expected]) => {
      expectClose(channels(normalizeColorValue(value)), expected);
    });
  });

  it('keeps alpha channels and handles color()/oklab()', () => {
    expect(normalizeColorValue('oklab(1 0 0 / 0.6)')).toBe('rgba(255, 255, 255, 0.6)');
    expect(normalizeColorValue('color(srgb 1 0 0 / 0.5)')).toBe('rgba(255, 0, 0, 0.5)');
    expect(normalizeColorValue('oklch(55.1% .027 264.364 / 50%)'))
      .toMatch(/^rgba\(106, 114, 130, 0\.5\)$/);
  });

  it('replaces modern colors inside gradients', () => {
    const value = 'linear-gradient(oklch(1 0 0), oklab(0.5 0 0))';
    expect(normalizeColorValue(value)).not.toMatch(/oklch|oklab/i);
    expect(channels(normalizeColorValue(value))).toEqual([255, 255, 255]);
  });

  it('leaves standard colors untouched', () => {
    expect(normalizeColorValue('#ffffff')).toBe('#ffffff');
    expect(normalizeColorValue('rgb(0, 0, 0)')).toBe('rgb(0, 0, 0)');
  });

  it('writes normalized inline styles on the cloned document', () => {
    const element = document.createElement('div');
    document.body.appendChild(element);
    vi.spyOn(window, 'getComputedStyle').mockReturnValue({
      color: 'oklch(55.1% .027 264.364)',
      backgroundColor: 'oklch(98.2% .018 155.826)',
      boxShadow: 'oklch(0 0 0 / 0.1) 0px 1px 2px',
    } as CSSStyleDeclaration);

    normalizeColorsForPdf(document);

    expectClose(channels(element.style.color), [106, 114, 130]);
    expectClose(channels(element.style.backgroundColor), [240, 253, 244]);
    expect(element.style.boxShadow).not.toMatch(/oklch/i);
  });

  it('drops declarations it cannot convert instead of breaking the export', () => {
    const element = document.createElement('div');
    document.body.appendChild(element);
    vi.spyOn(window, 'getComputedStyle').mockReturnValue({
      backgroundColor: 'color-mix(in oklab, white, transparent)',
    } as CSSStyleDeclaration);

    normalizeColorsForPdf(document);

    expect(element.style.backgroundColor).toBe('transparent');
  });
});
