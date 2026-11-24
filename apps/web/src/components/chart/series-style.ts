/**
 * The stroke colour of a series, by its place in the chart. Brand tokens only. The first two series
 * differ in colour too; a dashed series is told apart by its dash, not its colour alone.
 */
const STROKES = ["stroke-foreground", "stroke-accent", "stroke-muted-foreground"] as const

/** The stroke colours of a chart of many series: four tokens, then the same four again, told apart by dash or fade. */
const WIDE_STROKES = [
	"stroke-primary",
	"stroke-accent",
	"stroke-muted-foreground",
	"stroke-ring",
] as const

/** The fills that go with `WIDE_STROKES`, for bars and bands. */
const WIDE_FILLS = ["fill-primary", "fill-accent", "fill-muted-foreground", "fill-ring"] as const

/** The Tailwind stroke class of the series at an index. `wide` takes the longer palette of a many-series chart. */
export function strokeClass(index: number, wide = false): string {
	if (wide) return WIDE_STROKES[index % WIDE_STROKES.length] ?? "stroke-primary"
	return STROKES[Math.min(index, STROKES.length - 1)] ?? "stroke-foreground"
}

/** The Tailwind fill class of a bar or band at an index, from the longer palette. */
export function fillClass(index: number): string {
	return WIDE_FILLS[index % WIDE_FILLS.length] ?? "fill-primary"
}

/** The opacity of a bar or band: the palette's second round is lighter, so no colour is used twice alike. */
export function fillOpacity(index: number, faded = false): number {
	const base = index >= WIDE_FILLS.length ? 0.5 : 0.9
	return faded ? base * 0.45 : base
}

/** The dash pattern of a series: solid, dashed, dotted, or both (a dash and a dot), so four lines of one colour tell apart. */
export function dashPattern(dashed: boolean, dotted = false): string | undefined {
	if (dashed && dotted) return "10 3 2 3"
	if (dotted) return "2 3"
	return dashed ? "6 4" : undefined
}
