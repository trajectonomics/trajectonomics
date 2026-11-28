/** Which money the Bands are stated in: today's, from the CLI's realBands, or the nominal future (web ADR 0002). */
export type MoneyBasis = "today" | "future"

/** The money switch's choices, in the order the page shows them (the words the path page's terms already use). */
export const MONEY_OPTIONS: readonly { readonly value: MoneyBasis; readonly label: string }[] = [
	{ value: "today", label: "Today's money" },
	{ value: "future", label: "Future money" },
]
