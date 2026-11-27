/** Tailwind's `lg` breakpoint: from this width the side navigation is fixed, not a drawer. */
const WIDE_QUERY = "(min-width: 64rem)"

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
