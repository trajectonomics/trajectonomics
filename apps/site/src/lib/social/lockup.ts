/** The brand lockup a share image draws: the wordmark's own box, and the markup that draws it. */
export interface ShareLockup {
	/** The width the wordmark's own `viewBox` states, in its own units. */
	readonly width: number
	/** The height the wordmark's own `viewBox` states, in its own units. */
	readonly height: number
	/** The `path` markup the assets package ships, whose fill is `currentColor`. */
	readonly markup: string
}

/** The lockup drawn `heightPixels` tall with its top-left corner at x, y, in `colour`. */
export function placedLockup(
	lockup: ShareLockup,
	x: number,
	y: number,
	heightPixels: number,
	colour: string,
): string {
	const scale = Number((heightPixels / lockup.height).toFixed(4))
	return `<g transform="translate(${x} ${y}) scale(${scale})" color="${colour}">${lockup.markup}</g>`
}
