/**
 * The plan menu's focus and outside-click helpers. A component renders the menu but never touches the
 * document; this module does, through the element refs the component hands it.
 */

/** The items of a menu that can take focus, in reading order: the plans, then "All plans" and "New plan" (not when switched off). */
function itemsOf(menu: HTMLElement | undefined): HTMLElement[] {
	return menu === undefined
		? []
		: [...menu.querySelectorAll<HTMLElement>('[role^="menuitem"]:not(:disabled)')]
}

/** How many items the menu holds. */
export function menuItemCount(menu: HTMLElement | undefined): number {
	return itemsOf(menu).length
}

/** Moves focus to one item, clamped to the items the menu holds. */
export function focusMenuItem(menu: HTMLElement | undefined, index: number): void {
	const items = itemsOf(menu)
	items[Math.max(0, Math.min(index, items.length - 1))]?.focus()
}

/** The place of the focused item among the menu's items, or -1 when focus is elsewhere. */
export function focusedMenuItem(menu: HTMLElement): number {
	return itemsOf(menu).indexOf(document.activeElement as HTMLElement)
}

/** Focuses a control only when the click left focus on the page body or nowhere, so another control keeps its own. */
export function focusIfBody(element: HTMLElement | undefined): void {
	const active = document.activeElement
	if (active === null || active === document.body) element?.focus()
}

/**
 * Calls the listener on each click outside the element (and its children). A click is heard after the
 * browser has moved focus, so the listener can tell where the click left it. Returns the unsubscribe.
 */
export function subscribeOutsideClick(element: HTMLElement, listener: () => void): () => void {
	const onClick = (event: MouseEvent) => {
		const target = event.target
		if (target instanceof Node && element.contains(target)) return
		listener()
	}
	document.addEventListener("click", onClick)
	return () => document.removeEventListener("click", onClick)
}
