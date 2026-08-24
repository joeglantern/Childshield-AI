// Kombeo (slingshot) starter levels.
//
// Coordinates: `cx` is a fraction of screen width (0..1, so layouts scale
// across phones); `bottom` is px from the ground surface up to the block's
// underside. Stacks are hand-built so knocking lower blocks tumbles the
// ones above — that emergent physics is the fun, not pixel-perfect aim.
export type BlockKind = 'wide' | 'medium' | 'tall';

export const BLOCK_DIMS: Record<BlockKind, { w: number; h: number }> = {
  wide: { w: 84, h: 30 },
  medium: { w: 56, h: 30 },
  tall: { w: 30, h: 62 },
};

export interface LevelBlock {
  cx: number;
  bottom: number;
  kind: BlockKind;
}

export interface SlingshotLevel {
  id: string;
  blocks: LevelBlock[];
}

export const SHOTS_PER_LEVEL = 3;

export const SLINGSHOT_LEVELS: SlingshotLevel[] = [
  {
    // Two pillars with a lintel and a crown — one clean hit topples it all.
    id: 'L1',
    blocks: [
      { cx: 0.68, bottom: 0, kind: 'tall' },
      { cx: 0.84, bottom: 0, kind: 'tall' },
      { cx: 0.76, bottom: 62, kind: 'wide' },
      { cx: 0.76, bottom: 92, kind: 'medium' },
    ],
  },
  {
    // Low pyramid: wides on talls, medium on top.
    id: 'L2',
    blocks: [
      { cx: 0.64, bottom: 0, kind: 'tall' },
      { cx: 0.76, bottom: 0, kind: 'tall' },
      { cx: 0.88, bottom: 0, kind: 'tall' },
      { cx: 0.7, bottom: 62, kind: 'wide' },
      { cx: 0.83, bottom: 62, kind: 'wide' },
      { cx: 0.76, bottom: 92, kind: 'medium' },
    ],
  },
  {
    // Twin towers joined by a high bridge — hit either base.
    id: 'L3',
    blocks: [
      { cx: 0.63, bottom: 0, kind: 'tall' },
      { cx: 0.63, bottom: 62, kind: 'medium' },
      { cx: 0.89, bottom: 0, kind: 'tall' },
      { cx: 0.89, bottom: 62, kind: 'medium' },
      { cx: 0.76, bottom: 92, kind: 'wide' },
    ],
  },
  {
    // A solid wall, three courses high.
    id: 'L4',
    blocks: [
      { cx: 0.7, bottom: 0, kind: 'medium' },
      { cx: 0.84, bottom: 0, kind: 'medium' },
      { cx: 0.77, bottom: 30, kind: 'medium' },
      { cx: 0.7, bottom: 60, kind: 'medium' },
      { cx: 0.84, bottom: 60, kind: 'medium' },
      { cx: 0.77, bottom: 90, kind: 'medium' },
    ],
  },
  {
    // The castle: three pillars, two floors, a keep on top.
    id: 'L5',
    blocks: [
      { cx: 0.6, bottom: 0, kind: 'tall' },
      { cx: 0.76, bottom: 0, kind: 'tall' },
      { cx: 0.92, bottom: 0, kind: 'tall' },
      { cx: 0.68, bottom: 62, kind: 'wide' },
      { cx: 0.84, bottom: 62, kind: 'wide' },
      { cx: 0.68, bottom: 92, kind: 'medium' },
      { cx: 0.84, bottom: 92, kind: 'medium' },
      { cx: 0.76, bottom: 122, kind: 'medium' },
    ],
  },
];
