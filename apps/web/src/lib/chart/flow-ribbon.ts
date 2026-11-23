import { round } from "./flow-geometry"

/**
 * The closed path of one band: a ribbon between a left edge and a right edge, drawn as cubic curves. Pure:
 * numbers in, one path string out.
 */

/** One closed path from a band on the left to a band on the right: its top and bottom edges, as cubic curves. */
export function ribbon(
	x1: number,
	top1: number,
	bottom1: number,
	x2: number,
	top2: number,
	bottom2: number,
): string {
	const mid = (x1 + x2) / 2
	const p = (n: number) => String(round(n))
	return [
		`M${p(x1)},${p(top1)}`,
		`C${p(mid)},${p(top1)} ${p(mid)},${p(top2)} ${p(x2)},${p(top2)}`,
		`L${p(x2)},${p(bottom2)}`,
		`C${p(mid)},${p(bottom2)} ${p(mid)},${p(bottom1)} ${p(x1)},${p(bottom1)}`,
		"Z",
	].join(" ")
}
