/**
 * The fictional condo of the Demo plan: a real asset the way the Assets and debts form writes one (cli ADR 0060). It
 * is bought on 15 July 2027 with a loan, let and kept for ten years, and sold on 15 July 2037, when the loan is
 * repaid from the sale. Every figure is invented and in the document's integer minor units; the page states none of
 * them as a default. The dates fall on the 15th, a day the plan's monthly `fund` Contribution is not due.
 */
export const HOME_ACCOUNTS: readonly Record<string, unknown>[] = [
	{ id: "condo", kind: "asset", rate: 250, liquid: false },
	{ id: "condo-loan", kind: "liability", rate: 500, compounding: "monthly" },
]
