/**
 * The stroke colour of a series, by its place in the chart. Brand tokens only. The first two series
 * differ in colour too; a dashed series is told apart by its dash, not its colour alone.
 */
const STROKES = ["stroke-foreground", "stroke-accent", "stroke-muted-foreground"] as const

/** The Tailwind stroke class of the series at an index. */
export function strokeClass(index: number): string {
	return STROKES[Math.min(index, STROKES.length - 1)] ?? "stroke-foreground"
}

/** The dash pattern of a series: dashed or solid. */
export function dashPattern(dashed: boolean): string | undefined {
	return dashed ? "6 4" : undefined
}
