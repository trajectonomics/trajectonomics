/**
 * Putting a control back after the page refused its change. Svelte renders a control from the state, so when
 * a handler refuses and the state does not move, the DOM control keeps the choice the person just made and
 * shows something the page does not hold. Each function sets the control to what the page shows; the
 * controls are typed by the one property they need, so a test drives them with a plain object.
 */

/** A switch the page refused: it shows what the page holds, `on`. */
export function restoreSwitch(control: { checked: boolean }, on: boolean): void {
	control.checked = on
}

/** A select the page refused: it shows the option the page holds. */
export function restoreSelect(control: { value: string }, shown: string): void {
	control.value = shown
}

/** A radio group the page refused: only the option the page holds is checked. */
export function restoreRadios(
	radios: Iterable<{ readonly value: string; checked: boolean }>,
	shown: string,
): void {
	for (const radio of radios) radio.checked = radio.value === shown
}

/** The radio inputs of a fieldset, as its own `elements` list holds them. */
export function radiosOf(fieldset: HTMLFieldSetElement): HTMLInputElement[] {
	return [...fieldset.elements].filter(
		(element): element is HTMLInputElement =>
			element instanceof HTMLInputElement && element.type === "radio",
	)
}
