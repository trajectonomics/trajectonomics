/**
 * The estate block of the worked example (cli ADR-0064): what settling the plan's estate costs and what
 * is given from it. Every share is a stated example value, never a default: `traj` ships no cost and no
 * gift, and a person writing their own states theirs. A settlement cost of 1% of the gross estate, a
 * selling cost of 3% of the home's value, and a gift of 5% of the net estate to a temple, each rounding
 * to the nearest satang.
 */
export const EXAMPLE_ESTATE: Record<string, unknown> = {
	costs: [
		{ id: "settlement", of: "gross", bps: 100, rounding: "halfUp" },
		{ id: "home-selling", of: { accounts: ["home"] }, bps: 300, rounding: "halfUp" },
	],
	gifts: [{ id: "temple", of: "net", bps: 500, rounding: "halfUp" }],
}
