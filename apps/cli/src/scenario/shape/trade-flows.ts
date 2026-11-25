/** A purchase and a sale of the illiquid `home` Account: an obligation Contribution, and a withdrawal of its whole value (sim ADR 0021). */
export const TRADE_FLOWS: readonly Record<string, unknown>[] = [
	{
		id: "buy-home",
		kind: "contribution",
		target: "home",
		funding: "obligation",
		displayLabel: "Home",
		amount: 3_000_000,
		frequency: "once",
		start: "2026-06-01",
		growth: { bps: 0 },
	},
	{
		id: "sell-home",
		kind: "withdrawal",
		source: "home",
		derive: { measures: [{ id: "value", op: "account", account: "home" }], result: "value" },
		frequency: "once",
		start: "2030-06-01",
	},
]
