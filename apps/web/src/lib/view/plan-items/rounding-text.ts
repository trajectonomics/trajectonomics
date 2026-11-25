/** The words a payment's rounding reads as on a card. */
const ROUNDING_TEXT: Readonly<Record<string, string>> = {
	floor: "Rounded down",
	halfUp: "Rounded to the nearest",
	ceil: "Rounded up",
}

/** A rounding as a card words it; a word the CLI added since is shown as it is, and none stated is blank. */
export function roundingText(rounding: string | undefined): string {
	if (rounding === undefined) return ""
	return ROUNDING_TEXT[rounding] ?? rounding
}
