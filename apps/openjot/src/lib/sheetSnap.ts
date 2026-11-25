/** Where a bottom sheet rests after the thumb lets go. */
export type SheetSnap = "full" | "half" | "closed";

const FLICK_PX_PER_MS = 0.55;

/** Offset from fully open. Null when the sheet is too short to rest halfway. */
export function sheetHalfOffset(height: number): number | null {
  if (height < 420) return null;
  return Math.round(height * 0.42);
}

/**
 * `offset` is how far the sheet has been pulled down from fully open.
 * `velocityY` is px per ms, positive when the thumb is moving down.
 * Returns the offset to animate to. `height` means closed.
 */
export function snapSheetOffset(offset: number, velocityY: number, height: number): number {
  if (height <= 0) return 0;
  const clamped = Math.max(0, Math.min(height, offset));
  const half = sheetHalfOffset(height);

  if (velocityY > FLICK_PX_PER_MS) {
    if (half !== null && clamped < half * 0.75) return half;
    return height;
  }
  if (velocityY < -FLICK_PX_PER_MS) {
    if (half !== null && clamped > half * 0.85) return half;
    return 0;
  }

  if (half === null) return clamped > height * 0.33 ? height : 0;
  if (clamped < half / 2) return 0;
  if (clamped < (half + height) / 2) return half;
  return height;
}
