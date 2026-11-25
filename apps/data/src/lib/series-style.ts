/** How one plan's line is told apart: a Theme expression, a dash and a marker. */
export type MarkerShape = "circle" | "square" | "triangle" | "diamond"

/** One plan's visual cue. The colour is always composed from Theme roles. */
export type SeriesCue = {
	colour: string
	dash: string | null
	shape: MarkerShape
}

/** Eight distinct cues, so each plan's line differs in colour and in shape or dash. */
export const SERIES_CUES: readonly SeriesCue[] = Object.freeze([
	{ colour: "var(--ds-color-accent)", dash: null, shape: "circle" },
	{ colour: "var(--ds-color-primary)", dash: "8 4", shape: "square" },
	{ colour: "var(--ds-color-muted-foreground)", dash: "2 3", shape: "triangle" },
	{ colour: "var(--ds-color-destructive)", dash: "10 3 2 3", shape: "diamond" },
	{ colour: "var(--ds-color-input)", dash: "4 4", shape: "circle" },
	{
		colour: "color-mix(in srgb, var(--ds-color-accent) 55%, var(--ds-color-foreground))",
		dash: "12 4",
		shape: "square",
	},
	{
		colour: "color-mix(in srgb, var(--ds-color-destructive) 55%, var(--ds-color-foreground))",
		dash: "6 2 2 2",
		shape: "triangle",
	},
	{
		colour: "color-mix(in srgb, var(--ds-color-ring) 65%, var(--ds-color-background))",
		dash: "1 4",
		shape: "diamond",
	},
])

/** The cue for a line, cycling if a series has more plans than there are cues. */
export function seriesCue(index: number): SeriesCue {
	return SERIES_CUES[index % SERIES_CUES.length] as SeriesCue
}
