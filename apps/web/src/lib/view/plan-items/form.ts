/**
 * The text of a planner form, and what it may hold. Every check here is a shape check: the amount and
 * the date are kept as the person typed them, and `traj` decides whether they are valid.
 */

/** A money amount's shape as the document holds it: an optional sign, digits, and a fraction. */
const AMOUNT_TEXT = /^-?(0|[1-9]\d*)(\.\d+)?$/
const DATE_TEXT = /^\d{4}-\d{2}-\d{2}$/

/** Commas only as thousands separators: one to three digits, then groups of exactly three. */
const GROUPED_TEXT = /^-?\d{1,3}(,\d{3})+(\.\d+)?$/

/**
 * The amount as the person typed it, trimmed, with commas removed only where they separate thousands
 * ("9,000.50"), or null when the text is not a decimal number. A comma anywhere else ("9000,50", a
 * decimal comma) is refused, never dropped: dropping it would send an amount a hundred times larger.
 * The result is a string: it is never made into a number.
 */
export function typedAmount(text: string): string | null {
	const trimmed = text.trim()
	const plain = GROUPED_TEXT.test(trimmed) ? trimmed.replaceAll(",", "") : trimmed
	return AMOUNT_TEXT.test(plain) ? plain : null
}

/** Whether the text has the shape of a YYYY-MM-DD date. The CLI checks that it is a real day. */
export function isDateText(text: string): boolean {
	return DATE_TEXT.test(text)
}

/**
 * The id a new item takes from the name typed: its trimmed lower case, with each run of spaces as one
 * dash. Text only.
 */
export function slugId(name: string): string {
	return name.trim().toLowerCase().replace(/\s+/g, "-")
}

/** The base id, or the first of `base-2`, `base-3`, … that no taken id holds. */
export function uniqueId(base: string, taken: readonly string[]): string {
	if (!taken.includes(base)) return base
	for (let index = 2; ; index++) {
		const candidate = `${base}-${index}`
		if (!taken.includes(candidate)) return candidate
	}
}

/** The object without the named keys, so a field the form leaves empty is removed, not kept. */
export function withoutKeys(
	value: Readonly<Record<string, unknown>>,
	keys: readonly string[],
): Record<string, unknown> {
	return Object.fromEntries(Object.entries(value).filter(([key]) => !keys.includes(key)))
}
