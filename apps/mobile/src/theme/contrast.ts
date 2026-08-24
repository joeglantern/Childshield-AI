// WCAG 2.2 contrast maths.
//
// Kept in app source rather than in a script because the accessibility tests
// assert against it, and because `meetsContrast` is usable at runtime when a
// screen needs to pick a readable foreground for a variable background.
//
// Reference: WCAG 2.2 SC 1.4.3 (Contrast Minimum, AA) and 1.4.11
// (Non-text Contrast). Ratios run 1 (identical) to 21 (black on white).

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

/// Accepts '#RGB', '#RRGGBB' or 'rgba(r,g,b,a)'. For rgba the alpha is
/// composited over `over` (default white) — a translucent hairline has no
/// meaningful contrast without knowing what is behind it.
export function parseColor(color: string, over: Rgb = { r: 255, g: 255, b: 255 }): Rgb {
  const rgba = color.match(
    /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)$/i,
  );
  if (rgba) {
    const r = Number(rgba[1]);
    const g = Number(rgba[2]);
    const b = Number(rgba[3]);
    const a = rgba[4] === undefined ? 1 : Number(rgba[4]);
    return {
      r: r * a + over.r * (1 - a),
      g: g * a + over.g * (1 - a),
      b: b * a + over.b * (1 - a),
    };
  }

  let hex = color.replace('#', '').trim();
  if (hex.length === 3) {
    hex = hex
      .split('')
      .map((c) => c + c)
      .join('');
  }
  if (!/^[0-9a-f]{6}$/i.test(hex)) {
    throw new Error(`Unsupported colour format: ${color}`);
  }
  return {
    r: parseInt(hex.slice(0, 2), 16),
    g: parseInt(hex.slice(2, 4), 16),
    b: parseInt(hex.slice(4, 6), 16),
  };
}

/// WCAG relative luminance.
export function luminance(rgb: Rgb): number {
  const channel = (v: number): number => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(rgb.r) + 0.7152 * channel(rgb.g) + 0.0722 * channel(rgb.b);
}

/// Contrast ratio between two colours, 1–21.
export function contrastRatio(fg: string, bg: string): number {
  const bgRgb = parseColor(bg);
  // Translucent foregrounds composite over their own background.
  const fgRgb = parseColor(fg, bgRgb);
  const a = luminance(fgRgb);
  const b = luminance(bgRgb);
  const [hi, lo] = a > b ? [a, b] : [b, a];
  return (hi + 0.05) / (lo + 0.05);
}

/// WCAG AA thresholds. "Large" is 18pt+, or 14pt+ when bold.
export const AA_NORMAL = 4.5;
export const AA_LARGE = 3;
/// SC 1.4.11: UI components and graphical objects.
export const AA_NON_TEXT = 3;

export function isLargeText(fontSize: number, bold = false): boolean {
  return fontSize >= 18 || (bold && fontSize >= 14);
}

export function meetsContrast(
  fg: string,
  bg: string,
  { fontSize = 14, bold = false }: { fontSize?: number; bold?: boolean } = {},
): boolean {
  const required = isLargeText(fontSize, bold) ? AA_LARGE : AA_NORMAL;
  return contrastRatio(fg, bg) >= required;
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
