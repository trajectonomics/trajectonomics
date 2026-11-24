import type { LineSeries } from "../../lib/chart"
import { strokeClass } from "./series-style"
import type { LegendItem } from "./types"

/** The legend's rows: each series' name, whether it is dashed, and its stroke. */
export function legendItems(series: readonly LineSeries[], wide = false): LegendItem[] {
	return series.map((line, index) => ({
		name: line.name,
		dashed: line.dashed ?? false,
		dotted: line.dotted ?? false,
		stroke: strokeClass(index, wide),
	}))
}
