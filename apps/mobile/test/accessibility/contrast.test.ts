// ACCESSIBILITY: WCAG 2.2 AA contrast, enforced.
//
// Children with disabilities are abused at several times the rate of their
// peers, so a reporting app they cannot read excludes exactly the children
// most likely to need it. Contrast is therefore treated as a safeguarding
// requirement here, not as polish, and this file fails the build when a
// pairing regresses.
//
// Every entry below is a pairing the app actually renders. When you add a
// new colour combination, add it here too — a token that is never asserted
// is a token that will quietly drift.
// Never weaken or skip this file.

import { describe, expect, it } from 'vitest';
import {
  AA_LARGE,
  AA_NON_TEXT,
  AA_NORMAL,
  contrastRatio,
  isLargeText,
  round2,
} from '../../src/theme/contrast';
import { darkColors, lightColors, palette, severityColor } from '../../src/theme/tokens';

interface Pairing {
  name: string;
  fg: string;
  bg: string;
  /// Smallest size this pairing is drawn at, in px.
  fontSize: number;
  bold?: boolean;
}

const TEXT_PAIRINGS: Pairing[] = [
  // --- Light theme ---
  { name: 'body on background', fg: lightColors.text, bg: lightColors.bg, fontSize: 14 },
  { name: 'body on card', fg: lightColors.text, bg: lightColors.card, fontSize: 14 },
  { name: 'heading on background', fg: lightColors.heading, bg: lightColors.bg, fontSize: 20 },
  { name: 'muted on background', fg: lightColors.muted, bg: lightColors.bg, fontSize: 11 },
  { name: 'muted on card', fg: lightColors.muted, bg: lightColors.card, fontSize: 11 },
  { name: 'muted on teal tint', fg: lightColors.muted, bg: palette.tealTint, fontSize: 11 },
  // `faint` is placeholder and label text, not decoration — it must clear AA.
  { name: 'faint (placeholder) on card', fg: lightColors.faint, bg: lightColors.card, fontSize: 11 },
  { name: 'faint on background', fg: lightColors.faint, bg: lightColors.bg, fontSize: 11 },
  { name: 'accent text on background', fg: lightColors.accent, bg: lightColors.bg, fontSize: 10.5 },
  { name: 'accent text on card', fg: lightColors.accent, bg: lightColors.card, fontSize: 10.5 },
  { name: 'ink on amber CTA', fg: palette.ink, bg: palette.amber, fontSize: 16 },
  { name: 'amberInk on amber tint', fg: palette.amberInk, bg: palette.amberTint, fontSize: 11 },
  { name: 'disabled on background', fg: palette.disabledText, bg: lightColors.bg, fontSize: 14 },
  { name: 'inkSoft on background', fg: palette.inkSoft, bg: lightColors.bg, fontSize: 13 },

  // --- Dark theme ---
  { name: 'dark body on surface', fg: darkColors.text, bg: darkColors.bg, fontSize: 14 },
  { name: 'dark body on card', fg: darkColors.text, bg: darkColors.card, fontSize: 14 },
  { name: 'dark muted on surface', fg: darkColors.muted, bg: darkColors.bg, fontSize: 11 },
  { name: 'dark muted on card', fg: darkColors.muted, bg: darkColors.card, fontSize: 11 },
  { name: 'dark faint on surface', fg: darkColors.faint, bg: darkColors.bg, fontSize: 11 },
  { name: 'dark faint on card', fg: darkColors.faint, bg: darkColors.card, fontSize: 11 },
  { name: 'dark accent on surface', fg: darkColors.accent, bg: darkColors.bg, fontSize: 11 },
];

describe('WCAG AA text contrast', () => {
  it.each(TEXT_PAIRINGS)(
    '$name ($fg on $bg) meets AA',
    ({ name, fg, bg, fontSize, bold }) => {
      const required = isLargeText(fontSize, bold) ? AA_LARGE : AA_NORMAL;
      const ratio = contrastRatio(fg, bg);
      expect(
        ratio,
        `${name}: ${fg} on ${bg} is ${round2(ratio)}:1 at ${fontSize}px, needs ${required}:1`,
      ).toBeGreaterThanOrEqual(required);
    },
  );
});

describe('WCAG AA severity badges (officer views)', () => {
  // An officer misreading a severity badge is a triage risk, so these are
  // held to the same bar as body text despite being short labels.
  it.each(Object.entries(severityColor))('%s badge meets AA', (level, colors) => {
    const ratio = contrastRatio(colors.fg, colors.bg);
    expect(
      ratio,
      `${level}: ${colors.fg} on ${colors.bg} is ${round2(ratio)}:1, needs ${AA_NORMAL}:1`,
    ).toBeGreaterThanOrEqual(AA_NORMAL);
  });
});

describe('WCAG AA non-text contrast (SC 1.4.11)', () => {
  // Scope note: 1.4.11 covers visual information REQUIRED to identify a
  // component. A filled CTA is identified by its label, so the fill-versus-
  // page-background ratio is not in scope (the amber CTA is 1.97:1 against
  // cream and that is fine — its ink label is 5.33:1). What IS in scope are
  // icons carrying meaning on their own, and control edges.
  const NON_TEXT: Pairing[] = [
    { name: 'caret/chevron icons on card', fg: lightColors.faint, bg: lightColors.card, fontSize: 0 },
    { name: 'caret/chevron icons on background', fg: lightColors.faint, bg: lightColors.bg, fontSize: 0 },
    { name: 'muted icons on card', fg: lightColors.muted, bg: lightColors.card, fontSize: 0 },
    { name: 'accent icons on background', fg: lightColors.accent, bg: lightColors.bg, fontSize: 0 },
    { name: 'dark accent on surface', fg: darkColors.accent, bg: darkColors.bg, fontSize: 0 },
    { name: 'dark faint icons on card', fg: darkColors.faint, bg: darkColors.card, fontSize: 0 },
  ];

  it.each(NON_TEXT)('$name meets 3:1', ({ name, fg, bg }) => {
    const ratio = contrastRatio(fg, bg);
    expect(
      ratio,
      `${name}: ${fg} on ${bg} is ${round2(ratio)}:1, needs ${AA_NON_TEXT}:1`,
    ).toBeGreaterThanOrEqual(AA_NON_TEXT);
  });
});

describe('contrast helper', () => {
  it('computes the reference ratios', () => {
    expect(round2(contrastRatio('#000000', '#FFFFFF'))).toBe(21);
    expect(round2(contrastRatio('#FFFFFF', '#FFFFFF'))).toBe(1);
  });

  it('composites translucent foregrounds over their background', () => {
    // A 10% ink hairline on white is nearly invisible; treating it as opaque
    // ink would wrongly report it as high contrast.
    const ratio = contrastRatio('rgba(5,66,64,0.1)', '#FFFFFF');
    expect(ratio).toBeLessThan(1.5);
  });

  it('applies the large-text threshold correctly', () => {
    expect(isLargeText(18)).toBe(true);
    expect(isLargeText(14, true)).toBe(true);
    expect(isLargeText(14)).toBe(false);
  });
});
