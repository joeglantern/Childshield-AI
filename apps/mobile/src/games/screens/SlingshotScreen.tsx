// Kombeo — drag-back slingshot with real matter-js collisions. The
// projectile is the ChildShield logo; targets are Kenney block sprites
// tinted to brand colors. Same JS-thread-physics / shared-value-rendering
// architecture as tower.tsx (see the note there).
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { useStageDimensions } from '../../lib/layout';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import {
  makeMutable,
  runOnJS,
  useDerivedValue,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';
import {
  BlendColor,
  Canvas,
  Circle,
  Group,
  Image as SkiaImage,
  Line,
  Path,
  RoundedRect,
  Skia,
  useImage,
  vec,
  type SkImage,
} from '@shopify/react-native-skia';
import Matter from 'matter-js';
import { img } from '../../assets';
import { PressableScale } from '../../components/PressableScale';
import { QuickExitButton } from '../../components/QuickExitButton';
import { CloseIcon, StarIcon, StarOutlineIcon } from '../../components/icons';
import { useApp } from '../../state/AppContext';
import { useGames, type Stars } from '../../state/GamesContext';
import { createEngine, usePhysicsLoop } from '../../lib/physics';
import {
  BLOCK_DIMS,
  SHOTS_PER_LEVEL,
  SLINGSHOT_LEVELS,
  type BlockKind,
} from '../../games/slingshotLevels';
import { playSfx } from '../../sounds';
import { snap, submitted, tap, warn } from '../../lib/haptics';
import { font, palette, radius } from '../../theme/tokens';

const MAX_PULL = 120;
/// Launch velocity (matter px/step) per px of pull.
const LAUNCH_K = 0.16;
/// Matter's per-step gravity velocity gain at 60fps (gravity.y=1, default
/// gravityScale 0.001, delta 16.666ms): 0.001 * 16.666² ≈ 0.278 px/step².
const G_STEP = 0.278;
const PROJ_R = 19;
const DOTS = 12;
const MAX_TARGETS = 8;

const KIND_TINT: Record<BlockKind, string> = {
  wide: palette.teal,
  medium: palette.amber,
  tall: palette.lightTeal,
};

interface Pose {
  x: number;
  y: number;
  a: number;
}

function TargetSprite({
  image,
  kind,
  sv,
}: {
  image: SkImage;
  kind: BlockKind;
  sv: SharedValue<Pose>;
}) {
  const { w, h } = BLOCK_DIMS[kind];
  const transform = useDerivedValue(() => [
    { translateX: sv.value.x },
    { translateY: sv.value.y },
    { rotate: sv.value.a },
  ]);
  return (
    <Group transform={transform}>
      <SkiaImage image={image} x={-w / 2} y={-h / 2} width={w} height={h} fit="fill">
        <BlendColor color={KIND_TINT[kind]} mode="multiply" />
      </SkiaImage>
    </Group>
  );
}

function TrajectoryDot({ sv }: { sv: SharedValue<{ x: number; y: number }> }) {
  const cx = useDerivedValue(() => sv.value.x);
  const cy = useDerivedValue(() => sv.value.y);
  return <Circle cx={cx} cy={cy} r={3} color="rgba(0,156,156,0.45)" />;
}

type Phase = 'aiming' | 'flying' | 'cleared' | 'failed';

export default function SlingshotGame() {
  const { t, colors, isDark } = useApp();
  const { slingshot, recordSlingshotStars } = useGames();
  const insets = useSafeAreaInsets();
  const { width: W, height: H } = useStageDimensions();

  const logo = useImage(img.logo);
  const sprites = {
    wide: useImage(img.game.blocks.wide),
    medium: useImage(img.game.blocks.medium),
    tall: useImage(img.game.blocks.tall),
  };

  const groundTop = H - 150;
  const anchor = useMemo(() => ({ x: W * 0.2, y: groundTop - 120 }), [W, groundTop]);

  // Resume at the first level without stars.
  const [levelIdx, setLevelIdx] = useState(() => {
    const i = SLINGSHOT_LEVELS.findIndex((l) => !slingshot.starsByLevel[l.id]);
    return i === -1 ? 0 : i;
  });
  const level = SLINGSHOT_LEVELS[levelIdx]!;

  const [phase, setPhase] = useState<Phase>('aiming');
  const [shotsUsed, setShotsUsed] = useState(0);
  const [knocked, setKnocked] = useState(0);
  const [earnedStars, setEarnedStars] = useState<Stars>(1);
  const [attempt, setAttempt] = useState(0); // bumps on retry to rebuild the world

  // ---- simulation refs ----
  const engine = useMemo(() => createEngine(1), []);
  const targetsRef = useRef<{ body: Matter.Body; x0: number; y0: number }[]>([]);
  const projRef = useRef<Matter.Body | null>(null);
  const restTicksRef = useRef(0);
  const phaseRef = useRef<Phase>('aiming');
  const shotsRef = useRef(0);
  const knockedRef = useRef(0);
  const lastThudRef = useRef(0);

  // ---- shared values for the canvas ----
  const targetPool = useMemo(
    () => Array.from({ length: MAX_TARGETS }, () => makeMutable<Pose>({ x: 0, y: -9999, a: 0 })),
    [],
  );
  const proj = useMemo(() => makeMutable<Pose>({ x: anchor.x, y: anchor.y, a: 0 }), [anchor]);
  const dots = useMemo(
    () => Array.from({ length: DOTS }, () => makeMutable({ x: -20, y: -20 })),
    [],
  );

  // Build (or rebuild) the level world.
  useEffect(() => {
    Matter.Composite.clear(engine.world, false);
    const ground = Matter.Bodies.rectangle(W / 2, groundTop + 14, W * 2, 28, {
      isStatic: true,
      friction: 1,
    });
    Matter.World.add(engine.world, ground);

    targetsRef.current = level.blocks.map((b) => {
      const { w, h } = BLOCK_DIMS[b.kind];
      const x = b.cx * W;
      const y = groundTop - b.bottom - h / 2;
      const body = Matter.Bodies.rectangle(x, y, w, h, {
        restitution: 0.1,
        friction: 0.7,
        frictionStatic: 0.9,
        density: 0.0018,
      });
      return { body, x0: x, y0: y };
    });
    Matter.World.add(
      engine.world,
      targetsRef.current.map((t2) => t2.body),
    );

    projRef.current = null;
    phaseRef.current = 'aiming';
    shotsRef.current = 0;
    knockedRef.current = 0;
    restTicksRef.current = 0;
    proj.value = { x: anchor.x, y: anchor.y, a: 0 };
    setPhase('aiming');
    setShotsUsed(0);
    setKnocked(0);
  }, [engine, level, attempt, W, groundTop, anchor, proj]);

  useEffect(
    () => () => {
      Matter.Engine.clear(engine);
    },
    [engine],
  );

  // Impact thuds (throttled) whenever the projectile hits something hard.
  useEffect(() => {
    const onCollide = (e: Matter.IEventCollision<Matter.Engine>) => {
      const p = projRef.current;
      if (!p || p.speed < 3) return;
      const hit = e.pairs.some((pair) => pair.bodyA === p || pair.bodyB === p);
      const now = Date.now();
      if (hit && now - lastThudRef.current > 250) {
        lastThudRef.current = now;
        playSfx('thud');
      }
    };
    Matter.Events.on(engine, 'collisionStart', onCollide);
    return () => {
      Matter.Events.off(engine, 'collisionStart', onCollide);
    };
  }, [engine]);

  const settleShot = useCallback(() => {
    const p = projRef.current;
    if (p) Matter.World.remove(engine.world, p);
    projRef.current = null;
    proj.value = { x: anchor.x, y: anchor.y, a: 0 };

    shotsRef.current += 1;
    setShotsUsed(shotsRef.current);
    const total = targetsRef.current.length;

    if (knockedRef.current >= total) {
      const stars = Math.max(1, Math.min(3, 4 - shotsRef.current)) as Stars;
      setEarnedStars(stars);
      recordSlingshotStars(level.id, stars);
      phaseRef.current = 'cleared';
      setPhase('cleared');
      submitted();
      playSfx('success');
    } else if (shotsRef.current >= SHOTS_PER_LEVEL) {
      phaseRef.current = 'failed';
      setPhase('failed');
      warn();
      playSfx('gentleError');
    } else {
      phaseRef.current = 'aiming';
      setPhase('aiming');
    }
  }, [engine, anchor, proj, level.id, recordSlingshotStars]);

  const onTick = useCallback(() => {
    // Mirror target poses + count knocked-over blocks.
    let knockedNow = 0;
    const targets = targetsRef.current;
    for (let i = 0; i < targets.length && i < targetPool.length; i += 1) {
      const t2 = targets[i]!;
      const b = t2.body;
      targetPool[i]!.value = { x: b.position.x, y: b.position.y, a: b.angle };
      const displaced =
        Math.abs(b.position.x - t2.x0) + Math.abs(b.position.y - t2.y0) > 12 ||
        Math.abs(b.angle) > 0.35;
      if (displaced) knockedNow += 1;
    }
    if (knockedNow !== knockedRef.current) {
      knockedRef.current = knockedNow;
      setKnocked(knockedNow);
    }

    // Projectile flight → rest / out of bounds ends the shot.
    const p = projRef.current;
    if (p && phaseRef.current === 'flying') {
      proj.value = { x: p.position.x, y: p.position.y, a: p.angle };
      const out = p.position.x < -80 || p.position.x > W + 80 || p.position.y > H + 80;
      if (p.speed < 0.2) {
        restTicksRef.current += 1;
      } else {
        restTicksRef.current = 0;
      }
      if (out || restTicksRef.current >= 25) {
        restTicksRef.current = 0;
        settleShot();
      }
    }
  }, [W, H, targetPool, proj, settleShot]);

  usePhysicsLoop(engine, onTick, true);

  const launch = useCallback(
    (px: number, py: number, vx: number, vy: number) => {
      if (phaseRef.current !== 'aiming') return;
      const body = Matter.Bodies.circle(px, py, PROJ_R, {
        restitution: 0.35,
        friction: 0.35,
        density: 0.0045,
      });
      Matter.Body.setVelocity(body, { x: vx, y: vy });
      Matter.World.add(engine.world, body);
      projRef.current = body;
      phaseRef.current = 'flying';
      setPhase('flying');
      snap();
      playSfx('launch');
    },
    [engine],
  );

  const startPull = useCallback(() => {
    tap();
  }, []);

  // Drag anywhere to pull; the band + trajectory preview track the finger.
  const pan = useMemo(
    () =>
      Gesture.Pan()
        .enabled(phase === 'aiming')
        .onBegin(() => {
          'worklet';
          runOnJS(startPull)();
        })
        .onUpdate((e) => {
          'worklet';
          let dx = e.translationX;
          let dy = e.translationY;
          const len = Math.hypot(dx, dy);
          if (len > MAX_PULL) {
            dx = (dx / len) * MAX_PULL;
            dy = (dy / len) * MAX_PULL;
          }
          const px = anchor.x + dx;
          const py = anchor.y + dy;
          proj.value = { x: px, y: py, a: 0 };
          // Preview matter's own integration so the dots are honest.
          let vx = -dx * LAUNCH_K;
          let vy = -dy * LAUNCH_K;
          let x = px;
          let y = py;
          for (let i = 0; i < DOTS; i += 1) {
            for (let s = 0; s < 4; s += 1) {
              vy += G_STEP;
              x += vx;
              y += vy;
            }
            dots[i]!.value = { x, y };
          }
        })
        .onEnd((e) => {
          'worklet';
          let dx = e.translationX;
          let dy = e.translationY;
          const len = Math.hypot(dx, dy);
          if (len > MAX_PULL) {
            dx = (dx / len) * MAX_PULL;
            dy = (dy / len) * MAX_PULL;
          }
          for (let i = 0; i < DOTS; i += 1) dots[i]!.value = { x: -20, y: -20 };
          if (len < 14) {
            // Too small to be a real pull — snap back, no shot.
            proj.value = { x: anchor.x, y: anchor.y, a: 0 };
            return;
          }
          runOnJS(launch)(anchor.x + dx, anchor.y + dy, -dx * LAUNCH_K, -dy * LAUNCH_K);
        }),
    [phase, anchor, proj, dots, launch, startPull],
  );

  // ---- slingshot drawing (curved wooden Y-fork, drawn in code so it
  // scales crisply and matches the brand palette in both themes) ----
  const forkTipL = useMemo(() => vec(anchor.x - 28, anchor.y - 2), [anchor]);
  const forkTipR = useMemo(() => vec(anchor.x + 28, anchor.y - 2), [anchor]);
  const forkPath = useMemo(() => {
    const p = Skia.Path.Make();
    const baseY = groundTop + 6;
    const splitY = anchor.y + 52;
    // Trunk, then two branches curving out to the fork tips. The tips sit
    // wider than the pouch so the bands and the projectile stay visible.
    p.moveTo(anchor.x, baseY);
    p.lineTo(anchor.x, splitY);
    p.moveTo(anchor.x, splitY);
    p.quadTo(anchor.x - 12, anchor.y + 24, forkTipL.x, forkTipL.y);
    p.moveTo(anchor.x, splitY);
    p.quadTo(anchor.x + 12, anchor.y + 24, forkTipR.x, forkTipR.y);
    return p;
  }, [anchor, groundTop, forkTipL, forkTipR]);
  const woodDark = '#4A3009';
  const woodMain = isDark ? '#9C7326' : palette.amberInk;

  // ---- derived values for the band + projectile ----
  const bandP2 = useDerivedValue(() => vec(proj.value.x, proj.value.y));
  const projTransform = useDerivedValue(() => [
    { translateX: proj.value.x },
    { translateY: proj.value.y },
    { rotate: proj.value.a },
  ]);

  const totalBlocks = level.blocks.length;
  const isLastLevel = levelIdx + 1 >= SLINGSHOT_LEVELS.length;
  const overlay = phase === 'cleared' || phase === 'failed';

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <GestureDetector gesture={pan}>
        <View style={{ flex: 1 }}>
          <Canvas style={{ position: 'absolute', top: 0, left: 0, width: W, height: H }}>
            {/* Ground */}
            <RoundedRect
              x={-10}
              y={groundTop}
              width={W + 20}
              height={30}
              r={0}
              color={isDark ? palette.darkCardAlt : palette.track}
            />
            {/* Slingshot: outline stroke under a main stroke gives the fork
                depth; a small amber wrap marks the grip. */}
            <Path
              path={forkPath}
              style="stroke"
              strokeWidth={12}
              strokeCap="round"
              strokeJoin="round"
              color={woodDark}
            />
            <Path
              path={forkPath}
              style="stroke"
              strokeWidth={7.5}
              strokeCap="round"
              strokeJoin="round"
              color={woodMain}
            />
            <RoundedRect
              x={anchor.x - 9}
              y={groundTop - 52}
              width={18}
              height={22}
              r={7}
              color={palette.amber}
            />
            {/* Back band (behind the pouch) while aiming */}
            {phase === 'aiming' && (
              <Line p1={forkTipR} p2={bandP2} color={woodDark} strokeWidth={4.5} />
            )}
            {/* Trajectory preview */}
            {phase === 'aiming' && dots.map((d, i) => <TrajectoryDot key={i} sv={d} />)}
            {/* Targets */}
            {level.blocks.map((b, i) => {
              const sprite = sprites[b.kind];
              return (
                sprite && (
                  <TargetSprite
                    key={`${level.id}-${attempt}-${i}`}
                    image={sprite}
                    kind={b.kind}
                    sv={targetPool[i]!}
                  />
                )
              );
            })}
            {/* Projectile — the shield logo */}
            {logo && (phase === 'aiming' || phase === 'flying') && (
              <Group transform={projTransform}>
                <SkiaImage
                  image={logo}
                  x={-PROJ_R - 3}
                  y={-PROJ_R - 3}
                  width={(PROJ_R + 3) * 2}
                  height={(PROJ_R + 3) * 2}
                  fit="contain"
                />
              </Group>
            )}
            {/* Front band + pouch cradle the projectile while aiming */}
            {phase === 'aiming' && (
              <>
                <Line p1={forkTipL} p2={bandP2} color={woodDark} strokeWidth={4.5} />
                <Group transform={projTransform}>
                  <RoundedRect x={-16} y={3} width={32} height={14} r={7} color={woodDark} />
                </Group>
              </>
            )}
          </Canvas>

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
          <View
            style={{
              paddingHorizontal: 16,
              marginTop: 8,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
            pointerEvents="none"
          >
            <Text style={{ fontFamily: font.headingX, fontSize: 20, color: colors.heading }}>
              {t.games.slingshot.level(levelIdx + 1)}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Text style={{ fontFamily: font.bodyBold, fontSize: 13, color: colors.muted }}>
                {knocked}/{totalBlocks}
              </Text>
              <View style={{ flexDirection: 'row', gap: 4 }}>
                {Array.from({ length: SHOTS_PER_LEVEL }, (_, i) => (
                  <View key={i} style={{ opacity: i < SHOTS_PER_LEVEL - shotsUsed ? 1 : 0.25 }}>
                    <StarIcon size={14} color={palette.amber} />
                  </View>
                ))}
              </View>
            </View>
          </View>
          {phase === 'aiming' && shotsUsed === 0 && knocked === 0 && (
            <Text
              style={{
                position: 'absolute',
                bottom: insets.bottom + 44,
                alignSelf: 'center',
                fontFamily: font.bodyExtra,
                fontSize: 12,
                letterSpacing: 1,
                color: colors.faint,
              }}
              pointerEvents="none"
            >
              {t.games.slingshot.pullBack}
            </Text>
          )}
        </View>
      </GestureDetector>

      {/* Level end overlay */}
      {overlay && (
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
            {phase === 'cleared' ? t.games.slingshot.levelClear : t.games.slingshot.levelFailed}
          </Text>
          {phase === 'cleared' && (
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
              {([1, 2, 3] as const).map((s) =>
                s <= earnedStars ? (
                  <StarIcon key={s} size={34} color={palette.amber} />
                ) : (
                  <StarOutlineIcon key={s} size={34} color={colors.faint} />
                ),
              )}
            </View>
          )}
          <View style={{ width: '100%', gap: 10, marginTop: 28 }}>
            {phase === 'cleared' && !isLastLevel && (
              <PressableScale
                accessibilityRole="button"
                accessibilityLabel={t.games.slingshot.nextLevel}
                onPress={() => setLevelIdx((i) => i + 1)}
                style={{
                  height: 52,
                  borderRadius: radius.button,
                  backgroundColor: palette.amber,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ fontFamily: font.heading, fontSize: 16, color: palette.ink }}>
                  {t.games.slingshot.nextLevel}
                </Text>
              </PressableScale>
            )}
            <PressableScale
              accessibilityRole="button"
              accessibilityLabel={t.games.slingshot.retryLevel}
              onPress={() => setAttempt((a) => a + 1)}
              style={{
                height: 52,
                borderRadius: radius.button,
                backgroundColor:
                  phase === 'failed' ? palette.amber : colors.card,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text
                style={{
                  fontFamily: font.heading,
                  fontSize: 15,
                  color: phase === 'failed' ? palette.ink : colors.text,
                }}
              >
                {t.games.slingshot.retryLevel}
              </Text>
            </PressableScale>
            <PressableScale
              accessibilityRole="button"
              accessibilityLabel={t.games.slingshot.backToHub}
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
                {t.games.slingshot.backToHub}
              </Text>
            </PressableScale>
          </View>
        </View>
      )}
    </View>
  );
}
