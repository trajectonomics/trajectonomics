/**
 * Whether a click landed on a `<dialog>`'s backdrop: the event's target is the dialog element itself,
 * never one of the elements inside it, which is what a close button or a switch is.
 */
export function clickedBackdrop(target: unknown, dialog: unknown): boolean {
	return target === dialog
}
