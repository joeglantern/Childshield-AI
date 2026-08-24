// Small glyph icons (carets, arrows, timers). The mockups use Phosphor web
// glyphs; on native we map to the bundled Ionicons set (ships with Expo —
// no extra dependency) at matching sizes.
//
// ACCESSIBILITY: Ionicons renders a <Text> glyph node, so without this every
// chevron and check would be announced as a stray character next to the
// label it decorates. These are decorative by default and hidden from the
// accessibility tree. When an icon is the ONLY carrier of meaning (a star
// rating, a status tick with no text), pass an `accessibilityLabel` and it
// becomes an announced image instead.
import React from 'react';
import { Ionicons } from '@expo/vector-icons';

interface IconProps {
  size: number;
  color: string;
  /// Supply only when the glyph carries meaning no adjacent text conveys.
  accessibilityLabel?: string;
}

/// Shared props: decorative unless the caller names the icon.
function a11y(label?: string) {
  return label
    ? { accessible: true, accessibilityRole: 'image' as const, accessibilityLabel: label }
    : { accessible: false, accessibilityElementsHidden: true, importantForAccessibility: 'no-hide-descendants' as const };
}

export const CaretLeftIcon = ({ size, color, accessibilityLabel }: IconProps) => (
  <Ionicons name="chevron-back" size={size} color={color} {...a11y(accessibilityLabel)} />
);
export const CaretRightIcon = ({ size, color, accessibilityLabel }: IconProps) => (
  <Ionicons name="chevron-forward" size={size} color={color} {...a11y(accessibilityLabel)} />
);
export const CaretDownIcon = ({ size, color, accessibilityLabel }: IconProps) => (
  <Ionicons name="chevron-down" size={size} color={color} {...a11y(accessibilityLabel)} />
);
export const ArrowRightIcon = ({ size, color, accessibilityLabel }: IconProps) => (
  <Ionicons name="arrow-forward" size={size} color={color} {...a11y(accessibilityLabel)} />
);
export const TimerIcon = ({ size, color, accessibilityLabel }: IconProps) => (
  <Ionicons name="timer-outline" size={size} color={color} {...a11y(accessibilityLabel)} />
);
export const EyeIcon = ({ size, color, accessibilityLabel }: IconProps) => (
  <Ionicons name="eye-outline" size={size} color={color} {...a11y(accessibilityLabel)} />
);
export const CheckIcon = ({ size, color, accessibilityLabel }: IconProps) => (
  <Ionicons name="checkmark" size={size} color={color} {...a11y(accessibilityLabel)} />
);
export const CheckCircleIcon = ({ size, color, accessibilityLabel }: IconProps) => (
  <Ionicons name="checkmark-circle-outline" size={size} color={color} {...a11y(accessibilityLabel)} />
);
export const WifiOffIcon = ({ size, color, accessibilityLabel }: IconProps) => (
  <Ionicons name="cloud-offline-outline" size={size} color={color} {...a11y(accessibilityLabel)} />
);
export const RefreshIcon = ({ size, color, accessibilityLabel }: IconProps) => (
  <Ionicons name="refresh" size={size} color={color} {...a11y(accessibilityLabel)} />
);
export const InfoIcon = ({ size, color, accessibilityLabel }: IconProps) => (
  <Ionicons name="information-circle" size={size} color={color} {...a11y(accessibilityLabel)} />
);
export const CopyIcon = ({ size, color, accessibilityLabel }: IconProps) => (
  <Ionicons name="copy-outline" size={size} color={color} {...a11y(accessibilityLabel)} />
);
export const CloseIcon = ({ size, color, accessibilityLabel }: IconProps) => (
  <Ionicons name="close" size={size} color={color} {...a11y(accessibilityLabel)} />
);
export const StarIcon = ({ size, color, accessibilityLabel }: IconProps) => (
  <Ionicons name="star" size={size} color={color} {...a11y(accessibilityLabel)} />
);
export const StarOutlineIcon = ({ size, color, accessibilityLabel }: IconProps) => (
  <Ionicons name="star-outline" size={size} color={color} {...a11y(accessibilityLabel)} />
);
export const TrophyIcon = ({ size, color, accessibilityLabel }: IconProps) => (
  <Ionicons name="trophy" size={size} color={color} {...a11y(accessibilityLabel)} />
);
export const GameControllerIcon = ({ size, color, accessibilityLabel }: IconProps) => (
  <Ionicons name="game-controller" size={size} color={color} {...a11y(accessibilityLabel)} />
);
