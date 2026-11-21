/**
 * The index a key moves the hover to, from the current one. Arrows step, Home and End jump, and any
 * other key returns null, which means the key does nothing to the chart.
 */
export function keyTarget(key: string, current: number, count: number): number | null {
	if (count === 0) return null
	if (key === "ArrowLeft") return Math.max(0, current - 1)
	if (key === "ArrowRight") return Math.min(count - 1, current + 1)
	if (key === "Home") return 0
	if (key === "End") return count - 1
	return null
}
