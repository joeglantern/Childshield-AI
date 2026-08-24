// Mnara — stack-tower with real rigid-body physics.
//
// Architecture: matter-js steps on the JS thread (it is not worklet-safe —
// see src/lib/physics.ts) inside a requestAnimationFrame loop; every tick
// writes body positions into Reanimated shared values that the Skia canvas
// reads, so drawing never waits on React renders. React state only changes
// on discrete events (spawn, settle, game over). The aiming swing is
// deliberately NOT physics — a sine oscillation reads as fair to aim
// against; gravity takes over the moment the block is dropped.
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useStageDimensions } from '../../lib/layout';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  makeMutable,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  type SharedValue,
} from 'react-native-reanimated';
import {
  BlendColor,
  Canvas,
  DashPathEffect,
  Group,
  Image as SkiaImage,
  Line,
  RoundedRect,
  useImage,
  vec,
  type SkImage,
} from '@shopify/react-native-skia';
import Matter from 'matter-js';
import { img } from '../../assets';
import { PressableScale } from '../../components/PressableScale';
import { QuickExitButton } from '../../components/QuickExitButton';
import { CloseIcon, TrophyIcon } from '../../components/icons';
import { useApp } from '../../state/AppContext';
import { useGames } from '../../state/GamesContext';
import { createEngine, usePhysicsLoop } from '../../lib/physics';
import { TOWER, swingParams } from '../../games/towerConfig';
import { playSfx } from '../../sounds';
import { snap, tap, warn } from '../../lib/haptics';
import { spring, springPlayful } from '../../theme/motion';
import { font, palette, radius } from '../../theme/tokens';

interface BlockTransform {
  x: number;
  y: number;
  a: number;
}

function BlockSprite({
  image,
  tint,
  sv,
}: {
  image: SkImage;
  tint: string;
  sv: SharedValue<BlockTransform>;
}) {
  const transform = useDerivedValue(() => [
    { translateX: sv.value.x },
    { translateY: sv.value.y },
    { rotate: sv.value.a },
  ]);
  return (
    <Group transform={transform}>
      <SkiaImage
        image={image}
        x={-TOWER.blockW / 2}
        y={-TOWER.blockH / 2}
        width={TOWER.blockW}
        height={TOWER.blockH}
        fit="fill"
      >
        <BlendColor color={tint} mode="multiply" />
      </SkiaImage>
    </Group>
  );
}

/// "Kamili xN" chip — pops in with overshoot on every perfect drop.
function PerfectChip({ label }: { label: string }) {
  const scale = useSharedValue(0.3);
  useEffect(() => {
    scale.value = 0.3;
    scale.value = withSpring(1, springPlayful);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [label]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Animated.View
      style={[
        {
          backgroundColor: palette.amber,
          borderRadius: 999,
          paddingVertical: 5,
          paddingHorizontal: 14,
        },
        style,
      ]}
    >
      <Text style={{ fontFamily: font.heading, fontSize: 13, color: palette.ink }}>{label}</Text>
    </Animated.View>
  );
}

export default function TowerGame() {
  const { t, colors, isDark } = useApp();
  const { tower, recordTowerScore } = useGames();
  const insets = useSafeAreaInsets();
  const { width: W, height: H } = useStageDimensions();

  const wood = useImage(img.game.blocks.wide);

  const groundTop = H - 170;
  const groundW = W * TOWER.groundWidthRatio;
  const swingY = insets.top + 132;
  const tints = useMemo(
    () =>
      isDark
        ? [palette.darkAccent, palette.amber, palette.lightTeal]
        : [palette.teal, palette.amber, palette.lightTeal],
    [isDark],
  );

  // ---- simulation state (refs: mutated inside the physics tick) ----
  const engine = useMemo(() => createEngine(TOWER.gravityY), []);
  const bodiesRef = useRef<Matter.Body[]>([]);
  const fallingRef = useRef<{ body: Matter.Body; stillTicks: number } | null>(null);
  const statusRef = useRef<'ready' | 'falling' | 'over'>('ready');
  // Swing phase accumulator (radians). Advancing by delta/period each tick
  // keeps the motion continuous when the period shortens between floors.
  const swingPhaseRef = useRef(0);
  const prevTopXRef = useRef(W / 2);
  const floorsRef = useRef(0);
  const wobbleRef = useRef(false);

  // ---- render state (React: discrete events only) ----
  const [blocks, setBlocks] = useState<{ id: number; tint: string }[]>([]);
  const [floors, setFloors] = useState(0);
  const [combo, setCombo] = useState(0);
  const [wobbling, setWobbling] = useState(false);
  const [gameOver, setGameOver] = useState<{ floors: number; newRecord: boolean } | null>(null);

  // ---- shared values the Skia canvas reads ----
  const pool = useMemo(
    () =>
      Array.from({ length: TOWER.maxBlocks }, () =>
        makeMutable<BlockTransform>({ x: 0, y: -9999, a: 0 }),
      ),
    [],
  );
  const swingX = useSharedValue(W / 2);
  const cameraY = useSharedValue(0);
  const hintOpacity = useSharedValue(1);

  // Static ground body.
  useEffect(() => {
    const ground = Matter.Bodies.rectangle(
      W / 2,
      groundTop + TOWER.groundH / 2,
      groundW,
      TOWER.groundH,
      { isStatic: true, friction: 1 },
    );
    Matter.World.add(engine.world, ground);
    return () => {
      Matter.Engine.clear(engine);
    };
  }, [engine, W, groundTop, groundW]);

  // Tap-to-drop hint pulses gently while a block is waiting.
  useEffect(() => {
    hintOpacity.value = withRepeat(
      withSequence(withSpring(0.35, spring), withSpring(1, spring)),
      -1,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const endGame = useCallback(() => {
    if (statusRef.current === 'over') return;
    statusRef.current = 'over';
    const f = floorsRef.current;
    const newRecord = f > tower.highScore;
    recordTowerScore(f);
    setGameOver({ floors: f, newRecord });
    warn();
    playSfx('gentleError');
  }, [tower.highScore, recordTowerScore]);

  const onTick = useCallback(
    (delta: number) => {
      // Decorative aiming swing (screen space), ramping with the floor count.
      if (statusRef.current === 'ready') {
        const { periodMs, amplitudeRatio } = swingParams(floorsRef.current);
        swingPhaseRef.current += (2 * Math.PI * delta) / periodMs;
        swingX.value = W / 2 + W * amplitudeRatio * Math.sin(swingPhaseRef.current);
      }

      // Mirror body poses into the canvas's shared values.
      const bodies = bodiesRef.current;
      for (let i = 0; i < bodies.length && i < pool.length; i += 1) {
        const b = bodies[i]!;
        pool[i]!.value = { x: b.position.x, y: b.position.y, a: b.angle };
      }

      // Settling: the falling block comes to rest → it counts as a floor.
      const falling = fallingRef.current;
      if (falling) {
        if (falling.body.speed < TOWER.settleSpeed) {
          falling.stillTicks += 1;
        } else {
          falling.stillTicks = 0;
        }
        if (falling.stillTicks >= TOWER.settleTicks) {
          const settled = falling.body;
          fallingRef.current = null;
          const isPerfect =
            floorsRef.current > 0 &&
            Math.abs(settled.position.x - prevTopXRef.current) <= TOWER.perfectTolerance;
          prevTopXRef.current = settled.position.x;
          floorsRef.current += 1;
          setFloors(floorsRef.current);
          playSfx('thud');
          if (isPerfect) {
            setCombo((c) => c + 1);
            snap();
          } else {
            setCombo(0);
          }
          // Follow the tower up: keep the stack top comfortably below the swing.
          const stackTopWorldY = groundTop - floorsRef.current * TOWER.blockH;
          const target = Math.max(0, swingY + 130 - stackTopWorldY);
          cameraY.value = withSpring(target, spring);
          statusRef.current = 'ready';
        }
      }

      if (statusRef.current !== 'over') {
        // Fail states: a leaning tower, or anything falling off the world.
        let anyWobble = false;
        let ended = false;
        for (const b of bodies) {
          if (b === falling?.body) continue;
          const lean = Math.abs(b.angle);
          if (lean > TOWER.toppleAngleRad) {
            endGame();
            ended = true;
            break;
          }
          if (lean > 0.2) anyWobble = true;
        }
        if (!ended) {
          for (const b of bodies) {
            if (b.position.y > groundTop + TOWER.fallMarginPx) {
              endGame();
              ended = true;
              break;
            }
          }
        }
        if (!ended && anyWobble !== wobbleRef.current) {
          wobbleRef.current = anyWobble;
          setWobbling(anyWobble);
        }
      }
    },
    [W, groundTop, swingY, pool, swingX, cameraY, endGame],
  );

  usePhysicsLoop(engine, onTick, true);

  const drop = useCallback(() => {
    if (statusRef.current !== 'ready' || bodiesRef.current.length >= TOWER.maxBlocks) return;
    tap();
    const x = swingX.value;
    const y = swingY - cameraY.value; // screen → world
    // Carry a share of the swing's instantaneous horizontal velocity.
    const { periodMs, amplitudeRatio } = swingParams(floorsRef.current);
    const vxPerMs =
      W * amplitudeRatio * ((2 * Math.PI) / periodMs) * Math.cos(swingPhaseRef.current);
    const vx = vxPerMs * 16.666 * TOWER.swingVelocityCarry;

    const body = Matter.Bodies.rectangle(x, y, TOWER.blockW, TOWER.blockH, {
      restitution: TOWER.restitution,
      friction: TOWER.friction,
      frictionStatic: TOWER.frictionStatic,
      density: TOWER.density,
    });
    Matter.Body.setVelocity(body, { x: vx, y: 2 });
    Matter.World.add(engine.world, body);
    bodiesRef.current.push(body);
    fallingRef.current = { body, stillTicks: 0 };
    statusRef.current = 'falling';
    setBlocks((prev) => [...prev, { id: prev.length, tint: tints[prev.length % tints.length]! }]);
  }, [engine, W, swingY, swingX, cameraY, tints]);

  const restart = useCallback(() => {
    for (const b of bodiesRef.current) Matter.World.remove(engine.world, b);
    bodiesRef.current = [];
    fallingRef.current = null;
    floorsRef.current = 0;
    prevTopXRef.current = W / 2;
    statusRef.current = 'ready';
    wobbleRef.current = false;
    for (const m of pool) m.value = { x: 0, y: -9999, a: 0 };
    cameraY.value = withSpring(0, spring);
    setBlocks([]);
    setFloors(0);
    setCombo(0);
    setWobbling(false);
    setGameOver(null);
  }, [engine, W, pool, cameraY]);

  // ---- Skia derived values ----
  const worldTransform = useDerivedValue(() => [{ translateY: cameraY.value }]);
  const ropeP1 = useDerivedValue(() => vec(swingX.value, 0));
  const ropeP2 = useDerivedValue(() => vec(swingX.value, swingY - TOWER.blockH / 2));
  const guideP1 = useDerivedValue(() => vec(swingX.value, swingY + TOWER.blockH / 2 + 6));
  const guideP2 = useDerivedValue(() => vec(swingX.value, H));
  const swingTransform = useDerivedValue(() => [
    { translateX: swingX.value },
    { translateY: swingY },
  ]);
  const hintStyle = useAnimatedStyle(() => ({ opacity: hintOpacity.value }));

  const showSwing = !gameOver;
  const nextTint = tints[blocks.length % tints.length]!;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Canvas style={{ position: 'absolute', top: 0, left: 0, width: W, height: H }}>
        <Group transform={worldTransform}>
          <RoundedRect
            x={W / 2 - groundW / 2}
            y={groundTop}
            width={groundW}
            height={TOWER.groundH}
            r={8}
            color={isDark ? palette.darkCardAlt : palette.track}
          />
          {wood &&
            blocks.map((b, i) => (
              <BlockSprite key={b.id} image={wood} tint={b.tint} sv={pool[i]!} />
            ))}
        </Group>
        {showSwing && (
          <>
            <Line
              p1={ropeP1}
              p2={ropeP2}
              color={isDark ? palette.darkFaint : palette.caretFaint}
              strokeWidth={2}
            />
            <Line
              p1={guideP1}
              p2={guideP2}
              color={isDark ? 'rgba(79,209,203,0.25)' : 'rgba(0,156,156,0.2)'}
              strokeWidth={1.5}
            >
              <DashPathEffect intervals={[6, 8]} />
            </Line>
            {wood && (
              <Group transform={swingTransform}>
                <SkiaImage
                  image={wood}
                  x={-TOWER.blockW / 2}
                  y={-TOWER.blockH / 2}
                  width={TOWER.blockW}
                  height={TOWER.blockH}
                  fit="fill"
                >
                  <BlendColor color={nextTint} mode="multiply" />
                </SkiaImage>
              </Group>
            )}
          </>
        )}
      </Canvas>

      {/* Tap anywhere to drop. */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t.games.tower.tapToDrop}
        style={{ position: 'absolute', top: 0, left: 0, width: W, height: H }}
        onPress={drop}
      />

      {/* Top chrome */}
      <View
        style={{
          paddingTop: insets.top + 8,
          paddingHorizontal: 16,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
        pointerEvents="box-none"
      >
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel={t.common.cancel}
          onPress={() => router.back()}
          style={{
            width: 36,
            height: 36,
            borderRadius: 13,
            backgroundColor: colors.card,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <CloseIcon size={18} color={colors.text} />
        </PressableScale>
        <QuickExitButton />
      </View>
      <View style={{ alignItems: 'center', marginTop: 6, gap: 6 }} pointerEvents="none">
        <Text style={{ fontFamily: font.headingX, fontSize: 26, color: colors.heading }}>
          {t.games.tower.floor(floors)}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <TrophyIcon size={12} color={palette.amber} />
          <Text
            style={{
              fontFamily: font.bodyExtra,
              fontSize: 10.5,
              letterSpacing: 0.5,
              color: colors.muted,
            }}
          >
            {t.games.record(Math.max(tower.highScore, floors))}
          </Text>
        </View>
        {combo >= 2 && <PerfectChip label={t.games.tower.perfect(combo)} />}
        {wobbling && !gameOver && (
          <Text style={{ fontFamily: font.bodySemi, fontSize: 12, color: palette.amberInk }}>
            {t.games.tower.wobbling}
          </Text>
        )}
      </View>

      {/* Tap hint */}
      {!gameOver && (
        <Animated.Text
          style={[
            {
              position: 'absolute',
              bottom: insets.bottom + 46,
              alignSelf: 'center',
              fontFamily: font.bodyExtra,
              fontSize: 12,
              letterSpacing: 1,
              color: colors.faint,
            },
            hintStyle,
          ]}
          pointerEvents="none"
        >
          {t.games.tower.tapToDrop}
        </Animated.Text>
      )}

      {/* Game over */}
      {gameOver && (
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: W,
            height: H,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: isDark ? 'rgba(14,43,41,0.85)' : 'rgba(251,246,238,0.88)',
            padding: 28,
          }}
        >
          <Text style={{ fontFamily: font.headingX, fontSize: 24, color: colors.heading }}>
            {t.games.tower.gameOver}
          </Text>
          <Text
            style={{
              fontFamily: font.headingX,
              fontSize: 46,
              color: colors.accent,
              marginTop: 6,
            }}
          >
            {t.games.tower.floor(gameOver.floors)}
          </Text>
          {gameOver.newRecord && (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                marginTop: 10,
                backgroundColor: palette.amber,
                borderRadius: 999,
                paddingVertical: 7,
                paddingHorizontal: 14,
              }}
            >
              <TrophyIcon size={14} color={palette.ink} />
              <Text style={{ fontFamily: font.bodyBold, fontSize: 12.5, color: palette.ink }}>
                {t.games.tower.newRecord}
              </Text>
            </View>
          )}
          <View style={{ width: '100%', gap: 10, marginTop: 28 }}>
            <PressableScale
              accessibilityRole="button"
              accessibilityLabel={t.games.tower.playAgain}
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
                {t.games.tower.playAgain}
              </Text>
            </PressableScale>
            <PressableScale
              accessibilityRole="button"
              accessibilityLabel={t.games.trivia.backToHub}
              onPress={() => router.back()}
              style={{
                height: 52,
                borderRadius: radius.button,
                backgroundColor: colors.card,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ fontFamily: font.heading, fontSize: 15, color: colors.text }}>
                {t.games.trivia.backToHub}
              </Text>
            </PressableScale>
          </View>
        </View>
      )}
    </View>
  );
}
