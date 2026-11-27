/** Tailwind's `lg` breakpoint: from this width the side navigation is fixed, not a drawer. */
const WIDE_QUERY = "(min-width: 64rem)"

/** Tailwind's `md` breakpoint: from this width the Plan's chart is drawn taller. */
const MEDIUM_QUERY = "(min-width: 48rem)"

/**
 * Calls the listener when the viewport starts matching the `lg` breakpoint, so the menu drawer shuts as
 * the side navigation becomes fixed. Returns the unsubscribe. A browser that cannot answer gives a no-op.
 */
export function subscribeWide(listener: () => void): () => void {
	let query: MediaQueryList
	try {
		query = window.matchMedia(WIDE_QUERY)
	} catch {
		return () => {}
	}
	const onChange = (event: MediaQueryListEvent) => {
		if (event.matches) listener()
	}
	query.addEventListener("change", onChange)
	return () => query.removeEventListener("change", onChange)
}

/**
 * Calls the listener with whether the viewport is at least `md`, now and on each change across it, so a
 * figure's size follows the breakpoint rather than the width of the box it sits in. A browser that cannot
 * answer reads as narrow and never calls. Returns the unsubscribe.
 */
export function observeMedium(listener: (matches: boolean) => void): () => void {
	let query: MediaQueryList
	try {
		query = window.matchMedia(MEDIUM_QUERY)
	} catch {
		return () => {}
	}
	listener(query.matches)
	const onChange = (event: MediaQueryListEvent) => listener(event.matches)
	query.addEventListener("change", onChange)
	return () => query.removeEventListener("change", onChange)
}
