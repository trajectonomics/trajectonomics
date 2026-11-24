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
