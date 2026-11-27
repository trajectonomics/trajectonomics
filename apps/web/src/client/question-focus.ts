/**
 * Brings a question into view and takes focus for it, so a keyboard reader lands on its words. Returns the control
 * that had focus before, for the question's Stay to return focus to.
 */
export function takeQuestionFocus(question: HTMLElement): HTMLElement | null {
	const before = document.activeElement instanceof HTMLElement ? document.activeElement : null
	question.scrollIntoView({ block: "nearest" })
	question.focus({ preventScroll: true })
	return before
}

/** Puts focus back on a control, when there is one. */
export function returnFocus(control: HTMLElement | null): void {
	control?.focus()
}
