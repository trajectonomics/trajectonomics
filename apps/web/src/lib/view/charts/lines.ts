import type { Terms } from "../projection/terms"
import type { Drawn } from "./notes"
import type { Resolved } from "./types"
import type { ChartTable } from "./view"
import { periodText } from "./year"

/** The lines one series draws for the terms: its nominal line, its real line, or both. */
export function linesOf(found: Resolved, terms: Terms): Drawn[] {
	const { real } = found
	if (real === null) {
		const suffix = terms === "nominal" ? "" : " (nominal)"
		return [{ name: `${found.name}${suffix}`, dashed: false, dotted: false, points: found.nominal }]
	}
	return [
		...(terms === "real"
			? []
			: [{ name: found.name, dashed: false, dotted: false, points: found.nominal }]),
		...(terms === "nominal"
			? []
			: [{ name: `${found.name}, in As-of terms`, dashed: true, dotted: false, points: real }]),
	]
}

/** The second round of the palette is dotted, so a colour is never used twice alike (a real line is dashed, so dash and dot differ too). */
export function dashLater(line: Drawn, index: number): Drawn {
	return index >= 4 ? { ...line, dotted: true } : line
}

/** The text alternative: a row per period end, naming its period, and each series' CLI string in it, or null where it has no figure. */
export function tableOf(lines: readonly Drawn[]): ChartTable {
	const years = new Map(
		lines.flatMap((line) => line.points.map((point) => [point.x, periodText(point)] as const)),
	)
	return {
		headers: lines.map((line) => line.name),
		rows: [...years]
			.sort((a, b) => a[0] - b[0])
			.map(([x, label]) => ({
				label,
				cells: lines.map((line) => line.points.find((point) => point.x === x)?.amount ?? null),
			})),
	}
}
