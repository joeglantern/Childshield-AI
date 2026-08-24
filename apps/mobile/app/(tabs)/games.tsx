// Uwanja wa michezo — the games hub (tab-visible). Arcade games on top,
// calm corner below. SAFEGUARDING: every record shown here comes from
// on-device AsyncStorage only — no accounts, no server, no leaderboards.
import React from 'react';
import { Image, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { img } from '../../src/assets';
import { PressableScale } from '../../src/components/PressableScale';
import { QuickExitButton } from '../../src/components/QuickExitButton';
import { StaggerIn } from '../../src/components/StaggerIn';
import { Mascot } from '../../src/components/Mascot';
import { CaretRightIcon, StarIcon, TrophyIcon } from '../../src/components/icons';
import { SectionLabel } from '../../src/components/ui';
import { useApp } from '../../src/state/AppContext';
import { WEB_TAB_INSET } from '../../src/lib/layout';
import { useGames } from '../../src/state/GamesContext';
import { SLINGSHOT_LEVELS } from '../../src/games/slingshotLevels';
import { font, palette, radius } from '../../src/theme/tokens';

function Badge({ label, color, bg }: { label: string; color: string; bg: string }) {
  return (
    <View
      style={{
        alignSelf: 'flex-start',
        backgroundColor: bg,
        borderRadius: 999,
        paddingVertical: 4,
        paddingHorizontal: 10,
      }}
    >
      <Text style={{ fontFamily: font.bodyExtra, fontSize: 10, letterSpacing: 0.8, color }}>
        {label}
      </Text>
    </View>
  );
}

export default function GamesHub() {
  const { t, colors, isDark } = useApp();
  const { tower, slingshot, trivia, calm } = useGames();
  const insets = useSafeAreaInsets();

  const starsEarned = Object.values(slingshot.starsByLevel).reduce<number>((a, b) => a + b, 0);
  const starsMax = SLINGSHOT_LEVELS.length * 3;

  const calmRows: { key: string; icon: number; title: string; desc: string; href: string }[] = [
    {
      key: 'breathing',
      icon: img.tm.sunmoon,
      title: t.games.calm.breathing.title,
      desc: t.games.calm.breathing.instructionHold,
      href: '/games/calm/breathing',
    },
    {
      key: 'bubbles',
      icon: img.shape.brushcircle,
      title: t.games.calm.bubbles.title,
      desc: t.games.calm.bubbles.instruction,
      href: '/games/calm/bubbles',
    },
    {
      key: 'nest',
      icon: img.emptyNest,
      title: t.games.calm.nest.title,
      desc:
        calm.nestStreakDays > 0
          ? t.games.calm.nest.streak(calm.nestStreakDays)
          : t.games.calm.nest.instruction,
      href: '/games/calm/nest',
    },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 30 }}>
        <View
          style={{
            paddingTop: insets.top + 8 + WEB_TAB_INSET,
            paddingHorizontal: 16,
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Text style={{ fontFamily: font.headingX, fontSize: 24, color: colors.heading }}>
            {t.games.hubTitle}
          </Text>
          <QuickExitButton />
        </View>

        <View style={{ paddingHorizontal: 16, paddingTop: 14, gap: 12 }}>
          {/* Featured: daily trivia */}
          <StaggerIn index={0}>
            <PressableScale
              accessibilityRole="button"
              accessibilityLabel={t.games.trivia.title}
              onPress={() => router.push('/games/trivia')}
              style={{
                backgroundColor: palette.ink,
                borderRadius: radius.hero,
                padding: 20,
                overflow: 'hidden',
              }}
            >
              <View
                style={{
                  position: 'absolute',
                  width: 170,
                  height: 170,
                  borderRadius: 90,
                  backgroundColor: 'rgba(0,156,156,0.25)',
                  top: -70,
                  right: -55,
                }}
              />
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <Badge label={t.games.newDaily} color={palette.ink} bg={palette.amber} />
                  <Text
                    style={{
                      fontFamily: font.headingX,
                      fontSize: 21,
                      color: palette.white,
                      marginTop: 10,
                    }}
                  >
                    {t.games.trivia.title}
                  </Text>
                  <Text
                    style={{
                      fontFamily: font.body,
                      fontSize: 12.5,
                      color: 'rgba(255,255,255,0.75)',
                      marginTop: 4,
                      lineHeight: 18,
                    }}
                  >
                    {t.games.trivia.tagline}
                  </Text>
                  <View
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14 }}
                  >
                    <View
                      style={{
                        backgroundColor: palette.amber,
                        borderRadius: 999,
                        paddingVertical: 9,
                        paddingHorizontal: 22,
                      }}
                    >
                      <Text style={{ fontFamily: font.heading, fontSize: 14, color: palette.ink }}>
                        {t.games.play}
                      </Text>
                    </View>
                    {trivia.highScore > 0 && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                        <TrophyIcon size={13} color={palette.amber} />
                        <Text
                          style={{
                            fontFamily: font.bodyExtra,
                            fontSize: 11,
                            letterSpacing: 0.5,
                            color: 'rgba(255,255,255,0.8)',
                          }}
                        >
                          {t.games.record(trivia.highScore)}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
                <Mascot source={img.mascot.celebrate} size={104} variant="bob" />
              </View>
            </PressableScale>
          </StaggerIn>

          {/* Mnara + Kombeo tiles */}
          <StaggerIn index={1}>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <PressableScale
                accessibilityRole="button"
                accessibilityLabel={t.games.tower.title}
                onPress={() => router.push('/games/tower')}
                style={{
                  flex: 1,
                  backgroundColor: colors.card,
                  borderRadius: radius.cardLg,
                  padding: 16,
                  shadowColor: palette.ink,
                  shadowOpacity: isDark ? 0 : 0.05,
                  shadowRadius: 10,
                  shadowOffset: { width: 0, height: 3 },
                  elevation: 2,
                }}
              >
                <Image
                  source={img.game.blocks.tall}
                  style={{
                    width: 34,
                    height: 52,
                    resizeMode: 'contain',
                    tintColor: isDark ? palette.darkAccent : palette.teal,
                  }}
                />
                <Text
                  style={{
                    fontFamily: font.heading,
                    fontSize: 16,
                    color: colors.heading,
                    marginTop: 10,
                  }}
                >
                  {t.games.tower.title}
                </Text>
                <Text
                  style={{ fontFamily: font.body, fontSize: 11.5, color: colors.muted, marginTop: 2 }}
                >
                  {t.games.tower.tagline}
                </Text>
                <View
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 10 }}
                >
                  <TrophyIcon size={12} color={palette.amber} />
                  <Text
                    style={{
                      fontFamily: font.bodyExtra,
                      fontSize: 10.5,
                      letterSpacing: 0.5,
                      color: colors.muted,
                    }}
                  >
                    {t.games.record(tower.highScore)}
                  </Text>
                </View>
              </PressableScale>

              <PressableScale
                accessibilityRole="button"
                accessibilityLabel={t.games.slingshot.title}
                onPress={() => router.push('/games/slingshot')}
                style={{
                  flex: 1,
                  backgroundColor: colors.card,
                  borderRadius: radius.cardLg,
                  padding: 16,
                  shadowColor: palette.ink,
                  shadowOpacity: isDark ? 0 : 0.05,
                  shadowRadius: 10,
                  shadowOffset: { width: 0, height: 3 },
                  elevation: 2,
                }}
              >
                <Image
                  source={img.logo}
                  style={{ width: 46, height: 46, resizeMode: 'contain', marginVertical: 3 }}
                />
                <Text
                  style={{
                    fontFamily: font.heading,
                    fontSize: 16,
                    color: colors.heading,
                    marginTop: 10,
                  }}
                >
                  {t.games.slingshot.title}
                </Text>
                <Text
                  style={{ fontFamily: font.body, fontSize: 11.5, color: colors.muted, marginTop: 2 }}
                >
                  {t.games.slingshot.tagline}
                </Text>
                <View
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 10 }}
                >
                  <StarIcon size={12} color={palette.amber} />
                  <Text
                    style={{
                      fontFamily: font.bodyExtra,
                      fontSize: 10.5,
                      letterSpacing: 0.5,
                      color: colors.muted,
                    }}
                  >
                    {starsEarned}/{starsMax}
                  </Text>
                </View>
              </PressableScale>
            </View>
          </StaggerIn>

          {/* Tilt maze — coming soon */}
          <StaggerIn index={2}>
            <View
              style={{
                backgroundColor: colors.card,
                borderRadius: radius.card,
                padding: 16,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                opacity: 0.8,
              }}
            >
              <Image
                source={img.tm.sliders}
                style={{ width: 30, height: 30, resizeMode: 'contain' }}
              />
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: font.heading, fontSize: 14.5, color: colors.heading }}>
                  {t.games.tiltMazeTitle}
                </Text>
                <Text style={{ fontFamily: font.body, fontSize: 11.5, color: colors.muted }}>
                  {t.games.tiltMazeDesc}
                </Text>
              </View>
              <Badge
                label={t.games.comingSoonBadge}
                color={isDark ? palette.darkTextMuted : palette.textMuted}
                bg={isDark ? palette.darkCardAlt : palette.tealTint}
              />
            </View>
          </StaggerIn>

          {/* Privacy note */}
          <StaggerIn index={3}>
            <View
              style={{
                backgroundColor: isDark ? palette.darkCard : palette.tealTint,
                borderRadius: radius.card,
                padding: 14,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
              }}
            >
              <Image source={img.spot.lock} style={{ width: 26, height: 26, resizeMode: 'contain' }} />
              <Text
                style={{
                  flex: 1,
                  fontFamily: font.bodyMedium,
                  fontSize: 11.5,
                  lineHeight: 17,
                  color: colors.muted,
                }}
              >
                {t.games.privacyNote}
              </Text>
            </View>
          </StaggerIn>

          {/* Calm corner */}
          <StaggerIn index={4} style={{ marginTop: 10 }}>
            <SectionLabel>{t.games.calmTitle.toUpperCase()}</SectionLabel>
            <Text
              style={{
                fontFamily: font.body,
                fontSize: 12.5,
                color: colors.muted,
                marginTop: -4,
                marginBottom: 10,
              }}
            >
              {t.games.calmSubtitle}
            </Text>
            <View
              style={{
                backgroundColor: colors.card,
                borderRadius: radius.card,
                shadowColor: palette.ink,
                shadowOpacity: isDark ? 0 : 0.05,
                shadowRadius: 10,
                shadowOffset: { width: 0, height: 3 },
                elevation: 2,
              }}
            >
              {calmRows.map((row, i) => (
                <PressableScale
                  key={row.key}
                  accessibilityRole="button"
                  accessibilityLabel={row.title}
                  onPress={() => router.push(row.href)}
                  style={{
                    paddingVertical: 15,
                    paddingHorizontal: 18,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                    borderBottomWidth: i < calmRows.length - 1 ? 1 : 0,
                    borderBottomColor: isDark ? palette.darkSurface : 'rgba(5,66,64,0.08)',
                  }}
                >
                  <Image
                    source={row.icon}
                    style={{ width: 32, height: 32, resizeMode: 'contain' }}
                  />
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{ fontFamily: font.bodySemi, fontSize: 14.5, color: colors.text }}
                    >
                      {row.title}
                    </Text>
                    <Text
                      numberOfLines={1}
                      style={{ fontFamily: font.body, fontSize: 11.5, color: colors.muted }}
                    >
                      {row.desc}
                    </Text>
                  </View>
                  <CaretRightIcon size={14} color={colors.faint} />
                </PressableScale>
              ))}
            </View>
          </StaggerIn>
        </View>
      </ScrollView>
    </View>
  );
}
