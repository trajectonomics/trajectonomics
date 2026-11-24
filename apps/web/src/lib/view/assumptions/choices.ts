/**
 * The three plain choices beside an Account's volatility. A choice is a starting point: it fills the field with text, and the
 * person changes it as any other text (web ADR 0018). The figures are plan assumptions, not advice, and `traj` ships none: they
 * are rounded long-run spreads of yearly returns, which the ADR gives its reasoning for.
 */

/** One choice: what a person reads, a kind of holding it suits, and the percent text it fills in. */
export interface SwingChoice {
	readonly id: "steady" | "moderate" | "large"
	readonly label: string
	readonly example: string
	/** A percent as the field takes it: at most two places. */
	readonly text: string
}

/** The choices, from the least swing to the most. */
export const SWING_CHOICES: readonly SwingChoice[] = [
	{ id: "steady", label: "Steady", example: "such as deposits", text: "1" },
	{ id: "moderate", label: "Moderate", example: "such as mixed funds", text: "10" },
	{ id: "large", label: "Large", example: "such as shares", text: "18" },
]

/** The text a choice fills the field with. The field keeps no other trace of it: the person may type over it at once. */
export function fillWith(choice: SwingChoice): string {
	return choice.text
}

/** The choice whose text the field holds now, so the page can show it as picked; null when the text is the person's own. */
export function chosenOf(text: string): SwingChoice["id"] | null {
	return SWING_CHOICES.find((choice) => choice.text === text.trim())?.id ?? null
}
