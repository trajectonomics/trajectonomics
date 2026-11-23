/**
 * The fictional estate block of `base` (cli ADR 0064): a settlement cost as a share of everything owned, court and
 * legal fees as a fixed amount that keeps pace with inflation (50,000.00 in minor units), and a gift to a temple as a
 * share of what is left. Every share and amount is invented, as the Demo's others are; `traj` ships none. `retire-early` has no block, so the page shows the plan with
 * no settlement cost beside this one.
 */
export const DEMO_ESTATE: Record<string, unknown> = {
	costs: [
		{ id: "settlement", of: "gross", bps: 100, rounding: "halfUp" },
		{ id: "court-and-legal-fees", amount: 5000000, growth: "inflation" },
	],
	gifts: [{ id: "temple", of: "net", bps: 500, rounding: "halfUp" }],
}
