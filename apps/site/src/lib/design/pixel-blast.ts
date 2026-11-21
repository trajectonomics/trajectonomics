import { tileableNoise } from "./noise"

/** One cell of the field: ink, or the page showing through between squares. */
export type PixelBlastCell = boolean

/** A rasterized field, in cells: its size, and one ink flag for each cell in reading order. */
export interface PixelBlastField {
	readonly width: number
	readonly height: number
	readonly cells: readonly PixelBlastCell[]
}

/** What the field is drawn from: how many cells, how much ink, and which seed shapes the noise. */
export interface PixelBlastOptions {
	readonly width: number
	readonly height: number
	readonly ink: number
	readonly seed: number
}

/** The 8×8 Bayer matrix, as thresholds 0–63: the ordered dither the field prints with. */
const BAYER_8: readonly number[] = Object.freeze([
	0, 32, 8, 40, 2, 34, 10, 42, 48, 16, 56, 24, 50, 18, 58, 26, 12, 44, 4, 36, 14, 46, 6, 38, 60, 28,
	52, 20, 62, 30, 54, 22, 3, 35, 11, 43, 1, 33, 9, 41, 51, 19, 59, 27, 49, 17, 57, 25, 15, 47, 7,
	39, 13, 45, 5, 37, 63, 31, 55, 23, 61, 29, 53, 21,
])

/** The matrix's side, in cells: the dither repeats on this grid. */
const BAYER_SIDE = 8

/** The contrast the noise is stretched by, so the field has solid shapes and empty gaps between. */
const CONTRAST = 2.4

/** A lattice coordinate wrapped into the dither's grid, so its edges continue each other. */
function wrapped(value: number, side: number): number {
	return ((value % side) + side) % side
}

/** The Bayer threshold at one cell, as a share of the field's range. */
function bayerAt(x: number, y: number): number {
	const column = wrapped(x, BAYER_SIDE)
	const row = wrapped(y, BAYER_SIDE)
	return (BAYER_8[row * BAYER_SIDE + column] ?? 0) / (BAYER_SIDE * BAYER_SIDE)
}

/**
 * The line the noise is compared against, found by halving the interval: a cell inks more of the
 * Bayer matrix the further above the line it sits, so the mean coverage is the ink asked for.
 */
function lineFor(values: readonly number[], ink: number): number {
	const target = Math.min(0.99, Math.max(0.01, ink))
	const coverage = (line: number): number =>
		values.reduce((sum, value) => sum + Math.min(1, Math.max(0, value - line)), 0) / values.length
	let low = -1
	let high = 1
	for (let step = 0; step < 30; step += 1) {
		const middle = (low + high) / 2
		if (coverage(middle) > target) low = middle
		else high = middle
	}
	return (low + high) / 2
}

/**
 * The field: the noise, spread over its own range and stretched, then ordered-dithered to one bit.
 * Every cell is decided by the Bayer matrix, so the whole field is halftoned rather than only its
 * edges, and the line keeps the cells the caller asked for inked whatever the noise's mean is.
 */
export function pixelBlastField(options: PixelBlastOptions): PixelBlastField {
	const { width, height, ink, seed } = options
	const values: number[] = []
	let lowest = Number.POSITIVE_INFINITY
	let highest = Number.NEGATIVE_INFINITY
	for (let y = 0; y < height; y += 1) {
		for (let x = 0; x < width; x += 1) {
			const value = tileableNoise(x / width, y / height, seed)
			values.push(value)
			lowest = Math.min(lowest, value)
			highest = Math.max(highest, value)
		}
	}
	const range = highest - lowest || 1
	const spread = values.map((value) =>
		Math.min(1, Math.max(0, (value - lowest) / range - 0.5) * CONTRAST + 0.5),
	)
	const line = lineFor(spread, ink)
	const cells = spread.map((value, index) => {
		return value - line > bayerAt(index % width, Math.floor(index / width))
	})
	return { width, height, cells }
}
