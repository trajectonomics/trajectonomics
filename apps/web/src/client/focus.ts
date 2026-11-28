/**
 * After an Up or Down press moved a row, the browser moves its buttons in the document and drops focus with them. This
 * hands focus back to the pressed button at the row's new place, or, when the move turned it off at the top or the bottom,
 * to the row's other button, so a keyboard keeps going.
 */
export function keepFocus(
	pressed: HTMLButtonElement | undefined,
	other: HTMLButtonElement | undefined,
): void {
	if (pressed?.disabled === true) other?.focus()
	else pressed?.focus()
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
