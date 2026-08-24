// Small glyph icons (carets, arrows, timers). The mockups use Phosphor web
// glyphs; on native we map to the bundled Ionicons set (ships with Expo —
// no extra dependency) at matching sizes.
import React from 'react';
import { Ionicons } from '@expo/vector-icons';

interface IconProps {
  size: number;
  color: string;
}

export const CaretLeftIcon = ({ size, color }: IconProps) => (
  <Ionicons name="chevron-back" size={size} color={color} />
);
export const CaretRightIcon = ({ size, color }: IconProps) => (
  <Ionicons name="chevron-forward" size={size} color={color} />
);
export const CaretDownIcon = ({ size, color }: IconProps) => (
  <Ionicons name="chevron-down" size={size} color={color} />
);
export const ArrowRightIcon = ({ size, color }: IconProps) => (
  <Ionicons name="arrow-forward" size={size} color={color} />
);
export const TimerIcon = ({ size, color }: IconProps) => (
  <Ionicons name="timer-outline" size={size} color={color} />
);
export const EyeIcon = ({ size, color }: IconProps) => (
  <Ionicons name="eye-outline" size={size} color={color} />
);
export const CheckIcon = ({ size, color }: IconProps) => (
  <Ionicons name="checkmark" size={size} color={color} />
);
export const CheckCircleIcon = ({ size, color }: IconProps) => (
  <Ionicons name="checkmark-circle-outline" size={size} color={color} />
);
export const WifiOffIcon = ({ size, color }: IconProps) => (
  <Ionicons name="cloud-offline-outline" size={size} color={color} />
);
export const RefreshIcon = ({ size, color }: IconProps) => (
  <Ionicons name="refresh" size={size} color={color} />
);
export const InfoIcon = ({ size, color }: IconProps) => (
  <Ionicons name="information-circle" size={size} color={color} />
);
export const CopyIcon = ({ size, color }: IconProps) => (
  <Ionicons name="copy-outline" size={size} color={color} />
);
export const CloseIcon = ({ size, color }: IconProps) => (
  <Ionicons name="close" size={size} color={color} />
);
export const StarIcon = ({ size, color }: IconProps) => (
  <Ionicons name="star" size={size} color={color} />
);
export const StarOutlineIcon = ({ size, color }: IconProps) => (
  <Ionicons name="star-outline" size={size} color={color} />
);
export const TrophyIcon = ({ size, color }: IconProps) => (
  <Ionicons name="trophy" size={size} color={color} />
);
export const GameControllerIcon = ({ size, color }: IconProps) => (
  <Ionicons name="game-controller" size={size} color={color} />
);
