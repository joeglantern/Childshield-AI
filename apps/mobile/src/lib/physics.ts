// Physics loop helper for the arcade games (Mnara, Kombeo).
//
// matter-js is a normal prototype-based JS library — it is NOT worklet-ified
// and cannot run inside a Reanimated worklet/UI-thread callback. So the
// simulation step runs on the JS thread via requestAnimationFrame, and each
// tick writes body positions/angles into Reanimated shared values, which
// Skia reads to draw — this keeps rendering smooth without waiting on React
// state updates.
import Matter from 'matter-js';
import { useEffect, useRef } from 'react';

export function createEngine(gravityY = 1): Matter.Engine {
  const engine = Matter.Engine.create();
  engine.gravity.y = gravityY;
  return engine;
}

/// Steps `engine` via requestAnimationFrame while `running` is true, calling
/// `onTick(deltaMs)` after every physics step. Cleans up automatically on
/// unmount or when `running` flips false.
export function usePhysicsLoop(
  engine: Matter.Engine,
  onTick: (deltaMs: number) => void,
  running: boolean,
): void {
  const onTickRef = useRef(onTick);
  onTickRef.current = onTick;

  useEffect(() => {
    if (!running) return;
    let frameId: number;
    let lastTime = 0;

    const step = (time: number) => {
      // requestAnimationFrame's timestamp is a monotonic clock, not epoch
      // time — on the first tick there's no prior sample to diff against.
      const delta = lastTime === 0 ? 16.667 : Math.min(time - lastTime, 33.333);
      lastTime = time;
      Matter.Engine.update(engine, delta);
      onTickRef.current(delta);
      frameId = requestAnimationFrame(step);
    };
    frameId = requestAnimationFrame(step);

    return () => cancelAnimationFrame(frameId);
  }, [engine, running]);
}
