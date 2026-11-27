/** The plan switcher button's accessible name: the plan it shows, and what pressing it does. */
export function planButtonName(name: string): string {
	return name === "" ? "Plan. Change plan" : `Plan: ${name}. Change plan`
}

/**
 * The item a menu key moves focus to, in a menu of `count` items with focus on `index`; null when the key
 * moves nothing. ArrowDown and ArrowUp wrap at the ends, and Home and End jump to the ends.
 */
export function menuTarget(key: string, index: number, count: number): number | null {
	if (count === 0) return null
	switch (key) {
		case "ArrowDown":
			return (index + 1) % count
		case "ArrowUp":
			return (index - 1 + count) % count
		case "Home":
			return 0
		case "End":
			return count - 1
		default:
			return null
	}
}
