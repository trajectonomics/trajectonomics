import { currentSection } from "../lib/current-section"

/** How far below the viewport's top a section's heading counts as reached, under the sticky header. */
const REACHED_PX = 120

/**
 * Watches the page's sections and reports the one being read: the last whose top has passed just
 * under the header, or the last section once the page is scrolled to its bottom, because a short
 * last section never reaches the top. The sections render after the data loads, so each check
 * looks them up again instead of holding elements from the first run. This is the only module that
 * touches `window` and `document` for the nav; `src/lib` stays pure.
 */
export function watchSections(ids: readonly string[], onChange: (id: string) => void): () => void {
	if (typeof window === "undefined" || ids.length === 0) return () => {}
	let current = ""
	// Three lookups per scroll event are cheap; no animation frame, which a background tab pauses.
	const check = () => {
		const tops = ids.flatMap((id) => {
			const element = document.getElementById(id)
			return element === null ? [] : [{ id, top: element.getBoundingClientRect().top }]
		})
		const atBottom =
			window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2
		const next = currentSection(tops, atBottom, REACHED_PX)
		if (next !== null && next !== current) {
			current = next
			onChange(next)
		}
	}
	window.addEventListener("scroll", check, { passive: true })
	window.addEventListener("resize", check)
	check()
	return () => {
		window.removeEventListener("scroll", check)
		window.removeEventListener("resize", check)
	}
}
