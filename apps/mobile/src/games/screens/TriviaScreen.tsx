// Vita vya Maswali — daily safety-scenario trivia.
//
// The stage is intentionally dark in both themes (game-arena look from the
// mockups). SAFEGUARDING: wrong answers get a gentle explanation and the
// sad mascot — no red, no buzzer, no "WRONG" (palette.critical is
// officer-only and never appears here). Score persists on-device only.
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useStageDimensions } from '../../lib/layout';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { Canvas, Path, Skia } from '@shopify/react-native-skia';
import { img } from '../../assets';
import { Mascot } from '../../components/Mascot';
import { PressableScale } from '../../components/PressableScale';
import { QuickExitButton } from '../../components/QuickExitButton';
import { StaggerIn } from '../../components/StaggerIn';
import { CheckIcon, CloseIcon, TrophyIcon } from '../../components/icons';
import { useApp } from '../../state/AppContext';
import { useGames } from '../../state/GamesContext';
import { dailyQuestions } from '../../games/triviaQuestions';
import { playSfx } from '../../sounds';
import { submitted, warn } from '../../lib/haptics';
import { springPlayful } from '../../theme/motion';
import { font, palette, radius } from '../../theme/tokens';

const QUESTION_SECONDS = 15;
const RING = 50;

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

/// EXCEPTION to the springs-only motion rule (documented): the countdown
/// ring is a real-time clock, not UI feel — it must be linear and
/// time-faithful, so it uses withTiming(linear).
function CountdownRing({
  progress,
  secondsLeft,
}: {
  progress: SharedValue<number>;
  secondsLeft: number;
}) {
  const path = useDerivedValue(() => {
    const p = Skia.Path.Make();
    p.addArc({ x: 4, y: 4, width: RING - 8, height: RING - 8 }, -90, -360 * progress.value);
    return p;
  });
  const color = useDerivedValue(() =>
    progress.value < 0.34 ? palette.amber : palette.lightTeal,
  );
  const bgPath = useMemo(() => {
    const p = Skia.Path.Make();
    p.addCircle(RING / 2, RING / 2, (RING - 8) / 2);
    return p;
  }, []);

  return (
    <View style={{ width: RING, height: RING, alignItems: 'center', justifyContent: 'center' }}>
      <Canvas style={{ position: 'absolute', width: RING, height: RING }}>
        <Path path={bgPath} style="stroke" strokeWidth={4} color="rgba(255,255,255,0.12)" />
        <Path path={path} style="stroke" strokeWidth={4} strokeCap="round" color={color} />
      </Canvas>
      <Text style={{ fontFamily: font.heading, fontSize: 16, color: palette.white }}>
        {secondsLeft}
      </Text>
    </View>
  );
}

/// The "+120" fly-in when an answer lands correct.
function PointsPop({ points }: { points: number }) {
  const scale = useSharedValue(0.4);
  const ty = useSharedValue(10);
  useEffect(() => {
    scale.value = withSpring(1, springPlayful);
    ty.value = withSpring(0, springPlayful);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { translateY: ty.value }],
  }));
  return (
    <Animated.Text
      style={[{ fontFamily: font.headingX, fontSize: 26, color: palette.amber }, style]}
    >
      +{points}
    </Animated.Text>
  );
}

interface Feedback {
  picked: number | null;
  correct: boolean;
  points: number;
}

export default function TriviaGame() {
  const { t, locale } = useApp();
  const { trivia, recordTriviaRound } = useGames();
  const insets = useSafeAreaInsets();
  const { width } = useStageDimensions();

  const questions = useMemo(() => dailyQuestions(locale, todayKey()), [locale]);
  const [qIndex, setQIndex] = useState(0);
  const [phase, setPhase] = useState<'answering' | 'feedback' | 'results'>('answering');
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [bestCombo, setBestCombo] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(QUESTION_SECONDS);

  const progress = useSharedValue(1);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordedRef = useRef(false);

  const question = questions[qIndex];

  const stopClock = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    cancelAnimation(progress);
  }, [progress]);

  const answer = useCallback(
    (picked: number | null) => {
      if (phase !== 'answering' || !question) return;
      stopClock();
      const correct = picked !== null && picked === question.correctIndex;
      if (correct) {
        const newCombo = combo + 1;
        const points = 100 + secondsLeft * 5 + (newCombo - 1) * 25;
        setCombo(newCombo);
        setBestCombo((b) => Math.max(b, newCombo));
        setScore((s) => s + points);
        setFeedback({ picked, correct: true, points });
        submitted();
        playSfx('success');
      } else {
        setCombo(0);
        setFeedback({ picked, correct: false, points: 0 });
        warn();
        playSfx('gentleError');
      }
      setPhase('feedback');
    },
    [phase, question, combo, secondsLeft, stopClock],
  );

  // Per-question clock: smooth ring (linear timing, documented exception)
  // plus a 1s tick for the number, the tick sfx, and the timeout.
  useEffect(() => {
    if (phase !== 'answering') return undefined;
    setSecondsLeft(QUESTION_SECONDS);
    progress.value = 1;
    progress.value = withTiming(0, {
      duration: QUESTION_SECONDS * 1000,
      easing: Easing.linear,
    });
    timerRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        const next = s - 1;
        if (next <= 5 && next > 0) playSfx('tick');
        return next;
      });
    }, 1000);
    return stopClock;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, qIndex]);

  // Timeout — counts as a gentle miss.
  useEffect(() => {
    if (phase === 'answering' && secondsLeft <= 0) answer(null);
  }, [secondsLeft, phase, answer]);

  const next = useCallback(() => {
    setFeedback(null);
    if (qIndex + 1 >= questions.length) {
      setPhase('results');
    } else {
      setQIndex((i) => i + 1);
      setPhase('answering');
    }
  }, [qIndex, questions.length]);

  // Persist once when the round ends.
  useEffect(() => {
    if (phase === 'results' && !recordedRef.current) {
      recordedRef.current = true;
      recordTriviaRound(score, bestCombo);
    }
  }, [phase, score, bestCombo, recordTriviaRound]);

  const restart = useCallback(() => {
    recordedRef.current = false;
    setQIndex(0);
    setScore(0);
    setCombo(0);
    setBestCombo(0);
    setFeedback(null);
    setPhase('answering');
  }, []);

  const isLast = qIndex + 1 >= questions.length;

  return (
    <View style={{ flex: 1, backgroundColor: palette.darkSurface }}>
      {/* Top bar: close · progress segments · quick exit */}
      <View
        style={{
          paddingTop: insets.top + 8,
          paddingHorizontal: 16,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel={t.common.cancel}
          onPress={() => router.back()}
          style={{
            width: 36,
            height: 36,
            borderRadius: 13,
            backgroundColor: palette.darkCard,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <CloseIcon size={18} color={palette.darkText} />
        </PressableScale>
        <View style={{ flex: 1, flexDirection: 'row', gap: 4 }}>
          {questions.map((q, i) => (
            <View
              key={q.id}
              style={{
                flex: 1,
                height: 5,
                borderRadius: 3,
                backgroundColor:
                  i < qIndex || (i === qIndex && phase !== 'answering')
                    ? palette.lightTeal
                    : i === qIndex
                      ? palette.amber
                      : palette.darkCardAlt,
              }}
            />
          ))}
        </View>
        <QuickExitButton />
      </View>

      {phase === 'results' ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28 }}>
          <Mascot source={img.mascot.celebrate} size={140} variant="pop" />
          <Text
            style={{
              fontFamily: font.headingX,
              fontSize: 26,
              color: palette.white,
              marginTop: 18,
            }}
          >
            {t.games.trivia.roundOver}
          </Text>
          <Text
            style={{
              fontFamily: font.headingX,
              fontSize: 44,
              color: palette.amber,
              marginTop: 8,
            }}
          >
            {score}
          </Text>
          <Text style={{ fontFamily: font.bodySemi, fontSize: 14, color: palette.darkTextMuted }}>
            {t.games.trivia.bestCombo(bestCombo)}
          </Text>
          {score >= trivia.highScore && score > 0 && (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                marginTop: 12,
                backgroundColor: palette.darkCard,
                borderRadius: 999,
                paddingVertical: 7,
                paddingHorizontal: 14,
              }}
            >
              <TrophyIcon size={14} color={palette.amber} />
              <Text style={{ fontFamily: font.bodyBold, fontSize: 12.5, color: palette.darkText }}>
                {t.games.record(score)}
              </Text>
            </View>
          )}
          <View style={{ width: '100%', gap: 10, marginTop: 30 }}>
            <PressableScale
              accessibilityRole="button"
              accessibilityLabel={t.games.trivia.playAgain}
              onPress={restart}
              style={{
                height: 52,
                borderRadius: radius.button,
                backgroundColor: palette.amber,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ fontFamily: font.heading, fontSize: 16, color: palette.ink }}>
                {t.games.trivia.playAgain}
              </Text>
            </PressableScale>
            <PressableScale
              accessibilityRole="button"
              accessibilityLabel={t.games.trivia.backToHub}
              onPress={() => router.back()}
              style={{
                height: 52,
                borderRadius: radius.button,
                backgroundColor: palette.darkCard,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ fontFamily: font.heading, fontSize: 15, color: palette.darkText }}>
                {t.games.trivia.backToHub}
              </Text>
            </PressableScale>
          </View>
        </View>
      ) : (
        question && (
          <ScrollView
            contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 24 }}
            showsVerticalScrollIndicator={false}
          >
            {/* Score row: combo chip · question counter · ring */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginTop: 14,
              }}
            >
              <View style={{ gap: 6 }}>
                <Text
                  style={{
                    fontFamily: font.bodyExtra,
                    fontSize: 11,
                    letterSpacing: 0.8,
                    color: palette.darkFaint,
                  }}
                >
                  {t.games.trivia.questionOf(qIndex + 1, questions.length)}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={{ fontFamily: font.headingX, fontSize: 24, color: palette.white }}>
                    {score}
                  </Text>
                  {combo >= 2 && (
                    <View
                      style={{
                        backgroundColor: palette.amber,
                        borderRadius: 999,
                        paddingVertical: 3,
                        paddingHorizontal: 10,
                      }}
                    >
                      <Text style={{ fontFamily: font.bodyExtra, fontSize: 11, color: palette.ink }}>
                        {t.games.trivia.combo(combo)}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
              {phase === 'answering' && (
                <CountdownRing progress={progress} secondsLeft={Math.max(0, secondsLeft)} />
              )}
            </View>

            {/* Question */}
            <View
              style={{
                backgroundColor: palette.darkCard,
                borderRadius: radius.cardLg,
                padding: 18,
                marginTop: 16,
              }}
            >
              <Text
                style={{
                  fontFamily: font.bodyBold,
                  fontSize: 16,
                  lineHeight: 24,
                  color: palette.darkText,
                }}
              >
                {question.question}
              </Text>
            </View>

            {/* Options */}
            <View style={{ gap: 10, marginTop: 14 }}>
              {question.options.map((opt, i) => {
                const isCorrect = i === question.correctIndex;
                const isPicked = feedback?.picked === i;
                const revealed = phase === 'feedback';
                const bg =
                  revealed && isCorrect ? palette.teal : palette.darkCard;
                const borderColor =
                  revealed && isPicked && !isCorrect ? palette.amber : 'transparent';
                return (
                  <StaggerIn key={`${question.id}-${i}`} index={i}>
                    <PressableScale
                      accessibilityRole="button"
                      accessibilityLabel={opt}
                      disabled={revealed}
                      onPress={() => answer(i)}
                      style={{
                        backgroundColor: bg,
                        borderRadius: radius.tileLg,
                        borderWidth: 2,
                        borderColor,
                        paddingVertical: 14,
                        paddingHorizontal: 16,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 10,
                        opacity: revealed && !isCorrect && !isPicked ? 0.5 : 1,
                      }}
                    >
                      <Text
                        style={{
                          flex: 1,
                          fontFamily: font.bodySemi,
                          fontSize: 14,
                          lineHeight: 20,
                          color: revealed && isCorrect ? palette.white : palette.darkText,
                        }}
                      >
                        {opt}
                      </Text>
                      {revealed && isCorrect && <CheckIcon size={18} color={palette.white} />}
                    </PressableScale>
                  </StaggerIn>
                );
              })}
            </View>

            {/* Feedback */}
            {phase === 'feedback' && feedback && (
              <View style={{ marginTop: 16, alignItems: 'center', gap: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                  <Mascot
                    source={feedback.correct ? img.mascot.celebrate : img.mascot.sad}
                    size={76}
                    variant={feedback.correct ? 'pop' : 'sway'}
                  />
                  {feedback.correct && (
                    <View style={{ alignItems: 'flex-start' }}>
                      <Text
                        style={{ fontFamily: font.heading, fontSize: 17, color: palette.lightTeal }}
                      >
                        {t.games.trivia.correct}
                      </Text>
                      <PointsPop points={feedback.points} />
                      {combo >= 2 && (
                        <Text
                          style={{
                            fontFamily: font.bodySemi,
                            fontSize: 12,
                            color: palette.darkTextMuted,
                          }}
                        >
                          {t.games.trivia.comboContinues(combo)}
                        </Text>
                      )}
                    </View>
                  )}
                </View>
                <View
                  style={{
                    backgroundColor: palette.darkCardAlt,
                    borderRadius: radius.card,
                    padding: 14,
                    width: width - 40,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: font.bodyMedium,
                      fontSize: 13,
                      lineHeight: 20,
                      color: palette.darkTextMuted,
                    }}
                  >
                    {question.explanation}
                  </Text>
                </View>
                <PressableScale
                  accessibilityRole="button"
                  accessibilityLabel={isLast ? t.games.trivia.seeResults : t.games.trivia.nextQuestion}
                  onPress={next}
                  style={{
                    width: '100%',
                    height: 52,
                    borderRadius: radius.button,
                    backgroundColor: palette.amber,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginTop: 4,
                  }}
                >
                  <Text style={{ fontFamily: font.heading, fontSize: 16, color: palette.ink }}>
                    {isLast ? t.games.trivia.seeResults : t.games.trivia.nextQuestion}
                  </Text>
                </PressableScale>
              </View>
            )}
          </ScrollView>
        )
      )}
    </View>
  );
}
