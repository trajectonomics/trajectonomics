import type { CashflowLine, CashflowTotal } from "./cashflow"

/** The section of what an employer pays into an account: outside cash, so the CLI states no total for it (cli ADR 0067). */
export const EMPLOYER_SECTION = "from your employer"
export const EMPLOYER_NOTE =
	"Paid straight into the account. It never reaches your cash, so it is not in money in."

/**
 * The sections in the order a person reads them. Each names the total the CLI gives it and the line
 * groups that make up its rows. `money in` is income; withdrawals and drawn have their own sections,
 * which the engine's `money in` includes. Spending's categories and its per-Flow expenses are two views of
 * the same total, so each is a part under its own heading.
 */
export const SECTIONS: readonly {
	total: CashflowTotal["total"] | typeof EMPLOYER_SECTION
	parts: readonly { heading: string | null; groups: readonly CashflowLine["group"][] }[]
}[] = [
	{ total: "money in", parts: [{ heading: null, groups: ["income", "payout"] }] },
	{ total: "tax", parts: [{ heading: null, groups: ["prepaid", "settlement"] }] },
	{ total: "withdrawals", parts: [{ heading: null, groups: ["withdrawal"] }] },
	{ total: "drawn", parts: [{ heading: null, groups: ["drawn"] }] },
	{
		total: "spending",
		parts: [
			{ heading: "by category", groups: ["category"] },
			{ heading: "by expense", groups: ["expense"] },
		],
	},
	{ total: "saving", parts: [{ heading: null, groups: ["contribution"] }] },
	{ total: "not funded", parts: [{ heading: null, groups: ["unfunded"] }] },
	{ total: EMPLOYER_SECTION, parts: [{ heading: null, groups: ["employer"] }] },
	{ total: "left over", parts: [{ heading: null, groups: ["surplus"] }] },
	{ total: "unmet", parts: [{ heading: null, groups: ["unmet"] }] },
]
