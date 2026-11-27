/**
 * The plan menu's focus and outside-press helpers. A component renders the menu but never touches the
 * document; this module does, through the element refs the component hands it.
 */

/** The plan choices of a menu, in the order the person reads them. */
function itemsOf(menu: HTMLElement | undefined): HTMLElement[] {
	return menu === undefined ? [] : [...menu.querySelectorAll<HTMLElement>('[role="menuitemradio"]')]
}

/** How many plan choices the menu holds. */
export function menuItemCount(menu: HTMLElement | undefined): number {
	return itemsOf(menu).length
}

/** Moves focus to one choice, clamped to the choices the menu holds. */
export function focusMenuItem(menu: HTMLElement | undefined, index: number): void {
	const items = itemsOf(menu)
	items[Math.max(0, Math.min(index, items.length - 1))]?.focus()
}

/** The place of the focused choice among the menu's plan choices, or -1 when focus is elsewhere. */
export function focusedMenuItem(menu: HTMLElement): number {
	return itemsOf(menu).indexOf(document.activeElement as HTMLElement)
}

/** Calls the listener on each pointer press outside the element (and its children). Returns the unsubscribe. */
export function subscribeOutsidePointer(element: HTMLElement, listener: () => void): () => void {
	const onPointer = (event: PointerEvent) => {
		const target = event.target
		if (target instanceof Node && element.contains(target)) return
		listener()
	}
	document.addEventListener("pointerdown", onPointer)
	return () => document.removeEventListener("pointerdown", onPointer)
}
