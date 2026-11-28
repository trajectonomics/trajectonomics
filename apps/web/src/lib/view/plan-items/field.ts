import type { Choice } from "./options"

/** The choices a select offers, plus a held value the list does not name, so it never opens empty. */
export function fieldChoices(
	options: readonly Choice[] | undefined,
	value: string,
): readonly Choice[] | undefined {
	return options === undefined || value === "" || options.some((option) => option.value === value)
		? options
		: [...options, { value, label: value }]
}

/** Every text the field is described by, so a hint, a problem and the mask are all there. */
export function describedBy(
	id: string,
	parts: { hint: string | undefined; problem: string | undefined; masked: boolean },
): string | undefined {
	return (
		[
			parts.hint === undefined ? undefined : `${id}-hint`,
			parts.problem === undefined ? undefined : `${id}-problem`,
			parts.masked ? `${id}-masked` : undefined,
		]
			.filter((one) => one !== undefined)
			.join(" ") || undefined
	)
}
