import React from 'react';
import { Image, Linking, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { img } from '../../src/assets';
import { QuickExitButton } from '../../src/components/QuickExitButton';
import { PressableScale } from '../../src/components/PressableScale';
import { CaretRightIcon } from '../../src/components/icons';
import { useApp } from '../../src/state/AppContext';
import { WEB_TAB_INSET } from '../../src/lib/layout';
import { snap } from '../../src/lib/haptics';
import { font, palette } from '../../src/theme/tokens';

export default function Help() {
  const { t, colors, isDark } = useApp();
  const insets = useSafeAreaInsets();

  const resourceRow = (label: string, topic: string, divider: boolean) => (
    <PressableScale
      key={label}
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => router.push({ pathname: '/help/[topic]', params: { topic } })}
      style={{
        paddingVertical: 15,
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottomWidth: divider ? 1 : 0,
        borderBottomColor: isDark ? palette.darkSurface : 'rgba(5,66,64,0.07)',
      }}
    >
      <Text style={{ fontFamily: font.bodySemi, fontSize: 14, color: colors.text }}>{label}</Text>
      <CaretRightIcon size={14} color={colors.faint} />
    </PressableScale>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 28 }}>
        <View style={{ paddingTop: insets.top + 8 + WEB_TAB_INSET, paddingHorizontal: 20, alignItems: 'flex-end' }}>
          <QuickExitButton />
        </View>
        <View style={{ paddingHorizontal: 20, paddingTop: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 10 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: font.headingX, fontSize: 22, color: colors.heading }}>
                {t.help.title}
              </Text>
              <Image
                source={img.shape.squiggleTeal}
                style={{ width: 86, height: 12, marginTop: 3 }}
                resizeMode="stretch"
              />
              <Text
                style={{ fontFamily: font.body, fontSize: 13.5, color: colors.muted, marginTop: 5 }}
              >
                {t.help.subtitle}
              </Text>
            </View>
            <Image
              source={img.mascot.listen}
              style={{ width: 74, height: 74, resizeMode: 'contain' }}
            />
          </View>

          {/* Childline card */}
          <View
            style={{
              backgroundColor: palette.teal,
              borderRadius: 22,
              padding: 20,
              marginBottom: 16,
              overflow: 'hidden',
            }}
          >
            <View
              style={{
                position: 'absolute',
                width: 130,
                height: 130,
                borderRadius: 70,
                backgroundColor: 'rgba(255,255,255,0.12)',
                top: -50,
                right: -40,
              }}
            />
            <Text style={{ fontFamily: font.heading, fontSize: 17, color: palette.white }}>
              {t.help.childline}
            </Text>
            <Text style={{ fontFamily: font.body, fontSize: 13, color: '#DFF3F2', marginTop: 4 }}>
              {t.help.childlineSub}
            </Text>
            <PressableScale
              accessibilityRole="button"
              accessibilityLabel={t.help.callNow}
              onPress={() => {
                snap();
                void Linking.openURL('tel:116');
              }}
              style={{
                marginTop: 14,
                height: 46,
                borderRadius: 14,
                backgroundColor: palette.amber,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              <Image
                source={img.spot.phone}
                style={{ width: 24, height: 24, resizeMode: 'contain' }}
              />
              <Text style={{ fontFamily: font.bodyBold, fontSize: 14.5, color: palette.ink }}>
                {t.help.callNow}
              </Text>
            </PressableScale>
          </View>

          <View
            style={{
              backgroundColor: colors.card,
              borderRadius: 18,
              overflow: 'hidden',
              shadowColor: palette.ink,
              shadowOpacity: isDark ? 0 : 0.05,
              shadowRadius: 10,
              shadowOffset: { width: 0, height: 3 },
              elevation: 2,
            }}
          >
            {resourceRow(t.help.dcs, 'dcs', true)}
            {resourceRow(t.help.safetyTips, 'tips', true)}
            {resourceRow(t.help.helpFriend, 'friend', false)}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
