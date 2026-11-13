export type SpriteName = 'mite' | 'thermometer' | 'walk' | 'spray';
export interface SpriteFrame { x: number; y: number; width: number; height: number; footX?: number }
interface SpriteDefinition { file: string; columns: number; rows: number; width: number; height: number; frames?: SpriteFrame[] }
// The sprayer's painted characters do not line up with the declared 234px cells.
// Crop around their actual foot positions. Avoid the cut-off walk/spray edge poses
// by repeating an intact adjacent pose; never resample or alter the original PNGs.
export const SPRITES: Record<SpriteName, SpriteDefinition> = {
  mite: { file: 'varroa_mite_scurrying_sprite_sheet.png', columns: 3, rows: 2, width: 512, height: 512 },
  thermometer: { file: 'thermometer_stable_12frame_spritesheet.png', columns: 4, rows: 3, width: 210, height: 405 },
  walk: { file: 'pesticide_sprayer_walk_spritesheet.png', columns: 6, rows: 1, width: 234, height: 268, frames: [
    { x: 0, y: 0, width: 234, height: 268, footX: 81 }, { x: 234, y: 0, width: 234, height: 268, footX: 102 },
    { x: 494, y: 0, width: 234, height: 268, footX: 101 }, { x: 756, y: 0, width: 234, height: 268, footX: 106 },
    { x: 994, y: 0, width: 234, height: 268, footX: 105 }, { x: 756, y: 0, width: 234, height: 268, footX: 106 },
  ] },
  spray: { file: 'pesticide_sprayer_spray_spritesheet.png', columns: 6, rows: 1, width: 234, height: 272, frames: [
    { x: 170, y: 0, width: 196, height: 272, footX: 67 }, { x: 390, y: 0, width: 201, height: 272, footX: 72 },
    { x: 620, y: 0, width: 208, height: 272, footX: 79 }, { x: 895, y: 0, width: 193, height: 272, footX: 64 },
    { x: 1165, y: 0, width: 195, height: 272, footX: 66 }, { x: 895, y: 0, width: 193, height: 272, footX: 64 },
  ] },
};
export type SpriteImages = Partial<Record<SpriteName, HTMLImageElement>>;
let cached: Promise<SpriteImages> | undefined;
export function preloadEffectSprites(): Promise<SpriteImages> {
  return cached ??= Promise.all((Object.entries(SPRITES) as Array<[SpriteName, SpriteDefinition]>).map(([key, definition]) => new Promise<[SpriteName, HTMLImageElement | undefined]>(resolve => {
    const image = new Image(); image.onload = () => resolve([key, image]); image.onerror = () => resolve([key, undefined]);
    image.src = `${import.meta.env.BASE_URL}assets/dice-effects/${definition.file}`;
  }))).then(entries => Object.fromEntries(entries) as SpriteImages);
}
export function spriteFrame(name: SpriteName, index: number): SpriteFrame {
  const sheet = SPRITES[name];
  const frame = Math.max(0, Math.floor(index)) % (sheet.columns * sheet.rows);
  return sheet.frames?.[frame] ?? { x: frame % sheet.columns * sheet.width, y: Math.floor(frame / sheet.columns) * sheet.height, width: sheet.width, height: sheet.height };
}
export function drawSprite(ctx: CanvasRenderingContext2D, images: SpriteImages, name: SpriteName, frameIndex: number, x: number, y: number, width: number, height: number) {
  const image = images[name]; if (!image) return;
  const frame = spriteFrame(name, frameIndex);
  ctx.drawImage(image, frame.x, frame.y, frame.width, frame.height, x, y, width, height);
}
export function drawPerson(ctx: CanvasRenderingContext2D, images: SpriteImages, name: 'walk' | 'spray', index: number, footX: number, baseline: number, scale: number) {
  const frame = spriteFrame(name, index);
  drawSprite(ctx, images, name, index, footX - (frame.footX ?? 105) * scale, baseline - frame.height * scale, frame.width * scale, frame.height * scale);
}
