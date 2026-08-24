// Help article reader — DCS, online-safety tips, helping a friend.
// Child-facing: warm, calm, quick exit always visible.
import React from 'react';
import { Image, ScrollView, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { img } from '../../src/assets';
import { PressableScale } from '../../src/components/PressableScale';
import { QuickExitButton } from '../../src/components/QuickExitButton';
import { CaretLeftIcon } from '../../src/components/icons';
import { useApp } from '../../src/state/AppContext';
import { font, palette } from '../../src/theme/tokens';

const topicIcon: Record<string, number> = {
  dcs: img.p.officer,
  tips: img.spot.lock,
  friend: img.p.friends,
};

export default function HelpArticle() {
  const { t, colors, isDark } = useApp();
  const insets = useSafeAreaInsets();
  const { topic } = useLocalSearchParams<{ topic: string }>();

  const key = (topic === 'dcs' || topic === 'tips' || topic === 'friend' ? topic : 'tips') as
    | 'dcs'
    | 'tips'
    | 'friend';
  const article = t.helpArticles[key];

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View
        style={{
          paddingTop: insets.top + 8,
          paddingHorizontal: 20,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={() => router.back()}
          style={{
            width: 34,
            height: 34,
            borderRadius: 12,
            backgroundColor: colors.card,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <CaretLeftIcon size={16} color={colors.heading} />
        </PressableScale>
        <QuickExitButton />
      </View>
      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 16, paddingBottom: 30 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 6 }}>
          <Image
            source={topicIcon[key]}
            style={{ width: 40, height: 40, resizeMode: 'contain' }}
          />
          <Text
            style={{
              fontFamily: font.headingX,
              fontSize: 21,
              color: colors.heading,
              flex: 1,
              lineHeight: 26,
            }}
          >
            {article.title}
          </Text>
        </View>
        <Image
          source={img.shape.squiggleTeal}
          style={{ width: 86, height: 12, marginBottom: 12 }}
          resizeMode="stretch"
        />
        <Text
          style={{
            fontFamily: font.body,
            fontSize: 14,
            color: colors.muted,
            lineHeight: 22,
            marginBottom: 16,
          }}
        >
          {article.intro}
        </Text>
        <View
          style={{
            backgroundColor: colors.card,
            borderRadius: 20,
            padding: 18,
            gap: 14,
            shadowColor: palette.ink,
            shadowOpacity: isDark ? 0 : 0.05,
            shadowRadius: 12,
            shadowOffset: { width: 0, height: 4 },
            elevation: 2,
          }}
        >
          {article.points.map((point, i) => (
            <View key={i} style={{ flexDirection: 'row', gap: 11, alignItems: 'flex-start' }}>
              <View
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 3,
                  backgroundColor: i % 2 === 0 ? colors.accent : palette.amber,
                  marginTop: 6,
                }}
              />
              <Text
                style={{
                  fontFamily: font.body,
                  fontSize: 13.5,
                  color: isDark ? palette.darkTextMuted : palette.inkSoft,
                  lineHeight: 21,
                  flex: 1,
                }}
              >
                {point}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
