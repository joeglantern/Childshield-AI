// Small shared primitives matching the mockup geometry.
import React from 'react';
import { Image, Text, View, type ImageSourcePropType } from 'react-native';
import { PressableScale } from './PressableScale';
import { useApp } from '../state/AppContext';
import { font, palette, radius } from '../theme/tokens';
import { CaretRightIcon } from './icons';

/// Big amber primary button (52pt, radius 17, Baloo 700 ink text).
export function PrimaryButton({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={{
        width: '100%',
        height: 52,
        borderRadius: radius.button,
        backgroundColor: palette.amber,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <Text style={{ fontFamily: font.heading, fontSize: 16, color: palette.ink }}>{label}</Text>
    </PressableScale>
  );
}

/// Uppercase kicker label ("NAWEZA KUKUSAIDIAJE").
export function SectionLabel({ children }: { children: string }) {
  const { colors, isDark } = useApp();
  return (
    <Text
      style={{
        fontFamily: font.bodyExtra,
        fontSize: 11.5,
        letterSpacing: 0.6,
        color: isDark ? palette.darkFaint : colors.faint,
        marginBottom: 10,
      }}
    >
      {children}
    </Text>
  );
}

/// White card list row with a spot icon and caret.
export function CardRow({
  icon,
  label,
  onPress,
  divider,
}: {
  icon: ImageSourcePropType;
  label: string;
  onPress: () => void;
  divider?: boolean;
}) {
  const { colors, isDark } = useApp();
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={{
        paddingVertical: 16,
        paddingHorizontal: 18,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottomWidth: divider ? 1 : 0,
        borderBottomColor: isDark ? palette.darkSurface : 'rgba(5,66,64,0.08)',
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
        <Image source={icon} style={{ width: 30, height: 30, resizeMode: 'contain' }} />
        <Text style={{ fontFamily: font.bodySemi, fontSize: 14.5, color: colors.text }}>
          {label}
        </Text>
      </View>
      <CaretRightIcon size={14} color={colors.faint} />
    </PressableScale>
  );
}

/// Pill filter/selection chip.
export function Chip({
  label,
  selected,
  onPress,
  selectedBg = palette.teal,
  selectedFg = palette.white,
  dashed,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  selectedBg?: string;
  selectedFg?: string;
  dashed?: boolean;
}) {
  const { colors } = useApp();
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={{
        backgroundColor: selected ? selectedBg : colors.card,
        borderRadius: 999,
        paddingVertical: 8,
        paddingHorizontal: 14,
        borderWidth: selected ? 0 : 1,
        borderStyle: dashed ? 'dashed' : 'solid',
        borderColor: 'rgba(5,66,64,0.2)',
      }}
    >
      <Text
        style={{
          fontFamily: font.bodyBold,
          fontSize: 12,
          color: selected ? selectedFg : colors.text,
        }}
      >
        {label}
      </Text>
    </PressableScale>
  );
}

/// Radio circle used in option lists (amber-filled when selected).
export function RadioDot({ selected }: { selected: boolean }) {
  return selected ? (
    <View
      style={{
        width: 19,
        height: 19,
        borderRadius: 10,
        backgroundColor: palette.amber,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <View style={{ width: 6, height: 6, borderRadius: 2, backgroundColor: palette.white }} />
    </View>
  ) : (
    <View
      style={{
        width: 19,
        height: 19,
        borderRadius: 10,
        borderWidth: 1.5,
        borderColor: 'rgba(5,66,64,0.22)',
      }}
    />
  );
}
