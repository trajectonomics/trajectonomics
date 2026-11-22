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

/** The x labels a chart draws, spaced so that at most `maxTicks` of them fit. */
export function xTicksFor(
	labels: readonly string[],
	pixels: readonly number[],
	maxTicks: number,
): { index: number; label: string }[] {
	const every = Math.max(1, Math.ceil(labels.length / maxTicks))
	return labels.flatMap((label, index) =>
		index % every === 0 && pixels[index] !== undefined ? [{ index, label }] : [],
	)
}
