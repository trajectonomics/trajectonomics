/**
 * What an Account pays and costs, and what an employer adds (cli ADR-0067), as the two documents
 * `traj schema scenario apply` prints in its prose and a test proves the pinned core accepts beside the
 * worked example. Every figure is a stated example value, never a default: `traj` ships no employer
 * share, payout or fee, and a person writing their own states theirs.
 */

/**
 * An Account that pays out 3.5% of its value a year, a quarter at a time, as income that is not earned
 * while the rest of its return compounds, and charges a fee of 1.5% a year, a twelfth each month end.
 */
export const PAYOUT_ACCOUNT = {
	id: "dividend-fund",
	kind: "asset",
	rate: 600,
	payout: { bps: 350, frequency: "quarterly", rounding: "floor" },
	fee: { bps: 150, rounding: "halfUp" },
} as const

/**
 * The employer's share: 5% of the salary's gross into the locked `pension`, on each salary date. It is
 * the employer's own money, so it never passes through the household's cash and carries no retirement
 * allowance label: only the member's own contribution is deductible.
 */
export const EMPLOYER_FLOW = {
	id: "pension-match",
	kind: "contribution",
	target: "pension",
	funding: "employer",
	frequency: "monthly",
	start: "2026-01-01",
	endAt: "retire",
	derive: {
		measures: [
			{ id: "pay", op: "flow", flow: "salary" },
			{ id: "share", op: "scale", of: "pay", num: 5, den: 100, rounding: "floor" },
		],
		result: "share",
	},
} as const
