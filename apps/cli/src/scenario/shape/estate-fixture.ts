/**
 * An estate block that states every key a line takes, so each is documented: a share of the gross
 * estate, a share of named Accounts, a fixed cost in each growth form, a share gift and a fixed gift.
 * It reads Accounts the worked example declares.
 */
export const FULL_ESTATE: Record<string, unknown> = {
	costs: [
		{ id: "settlement", of: "gross", bps: 100, rounding: "halfUp" },
		{ id: "home-selling", of: { accounts: ["home"] }, bps: 300, rounding: "ceil" },
		{ id: "lawyer", amount: 50_000, growth: "inflation" },
		{ id: "transfer-fee", amount: 20_000, growth: { bps: 0 } },
	],
	gifts: [
		{ id: "temple", of: "net", bps: 500, rounding: "floor" },
		{ id: "family", amount: 100_000, growth: "inflation" },
	],
}
