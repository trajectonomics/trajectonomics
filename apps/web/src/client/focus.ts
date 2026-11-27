/**
 * After an Up or Down press moved a row to the edge, the button that was pressed is turned off and the browser drops focus
 * with it. This hands focus to the row's other button, so a keyboard keeps going.
 */
export function keepFocus(
	pressed: HTMLButtonElement | undefined,
	other: HTMLButtonElement | undefined,
): void {
	if (pressed?.disabled === true) other?.focus()
}

/**
 * Focuses a notice now, or, while a modal drawer that does not hold it is open, when that drawer closes (the
 * page behind it is inert). Returns what stops the wait.
 */
export function focusWhenSeen(node: HTMLElement): () => void {
	const modal = document.querySelector("dialog:modal")
	if (modal === null || modal.contains(node)) {
		node.focus()
		return () => {}
	}
	const take = (): void => node.focus()
	modal.addEventListener("close", take, { once: true })
	return () => modal.removeEventListener("close", take)
}
