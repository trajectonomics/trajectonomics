import { tick } from "svelte"

/**
 * A masked money input's focus: the focus shows the real value, so select the whole of it after the field has rendered,
 * and keep the mouseup of the click that focused it from collapsing that selection. Typing then replaces the value, as it
 * does with Hide amounts off. The parameter says whether the field is masked right now, before focus.
 */
export function maskedFocus(node: HTMLInputElement, isMasked: () => boolean) {
	let masked = isMasked
	let skipMouseUp = false

	async function onFocus(): Promise<void> {
		if (!masked()) return
		await tick()
		node.select()
		skipMouseUp = true
	}

	function onMouseUp(event: MouseEvent): void {
		if (!skipMouseUp) return
		skipMouseUp = false
		event.preventDefault()
	}

	node.addEventListener("focus", onFocus)
	node.addEventListener("mouseup", onMouseUp)
	return {
		update(next: () => boolean): void {
			masked = next
		},
		destroy(): void {
			node.removeEventListener("focus", onFocus)
			node.removeEventListener("mouseup", onMouseUp)
		},
	}
}
