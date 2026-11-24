import type { LineSeries } from "./line"

/** The x label of each distinct x, taken from the first point that has it. */
export function labelsFor(series: readonly LineSeries[], xs: readonly number[]): string[] {
	const labels = new Map<number, string>()
	for (const line of series) {
		for (const point of line.points) {
			if (!labels.has(point.x)) labels.set(point.x, point.xLabel)
		}
	}
	return xs.map((x) => labels.get(x) ?? "")
}

/** The tooltip's name of each distinct x (the period it covers), or its label where a point gives none. */
export function titlesFor(series: readonly LineSeries[], xs: readonly number[]): string[] {
	const titles = new Map<number, string>()
	for (const line of series) {
		for (const point of line.points) {
			if (!titles.has(point.x)) titles.set(point.x, point.xTitle ?? point.xLabel)
		}
	}
	return xs.map((x) => titles.get(x) ?? "")
}

/** The least room between two drawn x labels, in pixels, so a part-year period beside its neighbour stays readable. */
const MIN_GAP = 64

/** The x labels a chart draws, spaced so that at most `maxTicks` of them fit and no two touch. */
export function xTicksFor(
	labels: readonly string[],
	pixels: readonly number[],
	maxTicks: number,
): { index: number; label: string }[] {
	const every = Math.max(1, Math.ceil(labels.length / maxTicks))
	let last = Number.NEGATIVE_INFINITY
	return labels.flatMap((label, index) => {
		const at = pixels[index]
		if (index % every !== 0 || at === undefined || at - last < MIN_GAP) return []
		last = at
		return [{ index, label }]
	})
}
