import { tick } from "svelte"

/**
 * Whether a field's blur is the window losing focus: the browser has not moved focus off the field. A component cannot
 * read the document itself, so this is the page-side test of a tab switch.
 */
export function lostWindow(node: HTMLInputElement): boolean {
	return document.activeElement === node
}

/**
 * A masked money input's focus: the focus shows the real value, so select the whole of it after the field has rendered.
 * Only a click that focuses the field skips its mouseup, so the selection focus made survives the click; a click after a
 * keyboard focus moves the caret as it does anywhere else. A window blur is no edit of the field: it stays unmasked, and
 * the focus that returns selects nothing, so the digits typed before the switch are kept. The parameter says whether the
 * field is masked right now, before focus.
 */
export function maskedFocus(node: HTMLInputElement, isMasked: () => boolean) {
	let masked = isMasked
	let mouseDown = false
	let skipMouseUp = false
	let returning = false

	async function onFocus(): Promise<void> {
		const fromMouse = mouseDown
		mouseDown = false
		if (returning) {
			returning = false
			return
		}
		if (!masked()) return
		await tick()
		node.select()
		skipMouseUp = fromMouse
	}

	function onMouseDown(): void {
		mouseDown = true
	}

	function onMouseUp(event: MouseEvent): void {
		mouseDown = false
		if (!skipMouseUp) return
		skipMouseUp = false
		event.preventDefault()
	}

	function onKeyDown(): void {
		mouseDown = false
		skipMouseUp = false
	}

	function onBlur(): void {
		mouseDown = false
		skipMouseUp = false
		// The field is still the active element, so the window lost focus and the browser will return it to this field.
		if (lostWindow(node)) returning = true
	}

	node.addEventListener("focus", onFocus)
	node.addEventListener("mousedown", onMouseDown)
	node.addEventListener("mouseup", onMouseUp)
	node.addEventListener("keydown", onKeyDown)
	node.addEventListener("blur", onBlur)
	return {
		update(next: () => boolean): void {
			masked = next
		},
		destroy(): void {
			node.removeEventListener("focus", onFocus)
			node.removeEventListener("mousedown", onMouseDown)
			node.removeEventListener("mouseup", onMouseUp)
			node.removeEventListener("keydown", onKeyDown)
			node.removeEventListener("blur", onBlur)
		},
	}
}
