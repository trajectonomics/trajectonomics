/**
 * Cache reads as a fraction of a window's tokens. They are counted apart from the headline figure
 * because a provider charges far less for them.
 */
export function cacheShare(tokens: number, cacheRead: number | null | undefined): number | null {
	if (typeof cacheRead !== "number") return null
	const all = tokens + cacheRead
	return all <= 0 ? null : cacheRead / all
}

/** A cache-read share as words, or null when it rounds to nothing. */
export function cacheShareLabel(share: number | null): string | null {
	if (share === null || share <= 0) return null
	const percent = Math.round(share * 100)
	return `${percent === 0 ? "<1" : percent}% cache reads`
}
