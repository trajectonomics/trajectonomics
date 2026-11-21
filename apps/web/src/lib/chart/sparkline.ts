import { extent } from "./extent"
import { linePath, type PathPoint } from "./path"
import { linearScale } from "./scale"

/**
 * The path of a sparkline through its values, in a box of the given size. The shape is scaled to
 * the values' own range, not from zero, so a small change still shows. Empty for no values.
 */
export function sparklinePath(values: readonly number[], width: number, height: number): string {
	const domain = extent(values)
	if (!domain) return ""
	const scaleY = linearScale(domain, { from: height, to: 0 })
	const step = values.length > 1 ? width / (values.length - 1) : 0
	const points: PathPoint[] = values.map((value, index) => ({
		x: index * step,
		y: scaleY(value),
	}))
	return linePath(points)
}
