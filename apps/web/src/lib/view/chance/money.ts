/** Which money the Bands are stated in: today's, from the CLI's realBands, or the nominal future (web ADR 0002). */
export type MoneyBasis = "today" | "future"

/** The name of each money, as the switch and every label beside a figure say it (the words the path page's terms already use). */
export const MONEY_LABELS: Readonly<Record<MoneyBasis, string>> = {
	today: "Today's money",
	future: "Future money",
}

/** The money switch's choices, in the order the page shows them. */
export const MONEY_OPTIONS: readonly { readonly value: MoneyBasis; readonly label: string }[] = [
	{ value: "today", label: MONEY_LABELS.today },
	{ value: "future", label: MONEY_LABELS.future },
]
