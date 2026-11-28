/** The geometry of the Chance focus grid, in the SVG's own units: its columns, rows, cell and square. */
export interface ChanceGridLayout {
	readonly width: number
	readonly height: number
	readonly cols: number
	readonly rows: number
	/** One cell: a square plus the gap that follows it. */
	readonly cell: number
	/** The gap between squares, 15% of a cell. */
	readonly gap: number
	/** One square's side. */
	readonly size: number
	/** The left edge of the grid, so it sits centred in the box. */
	readonly x: number
	/** The top edge of the grid, so it sits centred in the box. */
	readonly y: number
}

/**
 * The grid of `paths` squares in a box: as close to a square block as the box's shape allows. Every square
 * is placed for drawing only; nothing here is a figure the page states (web ADR 0002).
 */
export function chanceGridLayout(paths: number, width: number, height: number): ChanceGridLayout {
	const n = Math.max(1, Math.floor(paths))
	const cols = Math.max(1, Math.ceil(Math.sqrt((n * width) / height)))
	const rows = Math.max(1, Math.ceil(n / cols))
	const cell = Math.min(width / cols, height / rows)
	const gap = cell * 0.15
	return {
		width,
		height,
		cols,
		rows,
		cell,
		gap,
		size: cell - gap,
		x: (width - cols * cell) / 2,
		y: (height - rows * cell) / 2,
	}
}
