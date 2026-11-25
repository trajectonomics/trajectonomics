/** Runs `pick` for Enter or Space, the keys that press a diagram band, and keeps the page from scrolling on Space. */
export function keyed(event: KeyboardEvent, pick: () => void): void {
	if (event.key !== "Enter" && event.key !== " ") return
	event.preventDefault()
	pick()
}
