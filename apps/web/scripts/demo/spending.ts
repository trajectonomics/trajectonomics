import type { DemoAccountIds } from "./scenario"

/**
 * The fictional retirement spending of `base` (cli ADR 0063): from the day after the salary stops, a share of what
 * the bank and the fund are worth, cut by a tenth when the share has grown a fifth above its start and raised by a
 * tenth when it has fallen a fifth below. Every figure is invented, as the Demo's others are; `traj` ships none.
 * The Flow is added after `retire-early` is forked, so only `base` has it.
 */
export function demoSpendingFlows(ids: DemoAccountIds): Record<string, unknown>[] {
	return [
		{
			id: "retirement-spending",
			displayLabel: "Spending in retirement",
			kind: "expense",
			frequency: "monthly",
			start: "2050-06-01",
			rule: {
				kind: "guardrails",
				portfolio: [ids.bank, ids.fund],
				rateBps: 400,
				rounding: "floor",
				upper: { bps: 2000, adjustBps: 1000 },
				lower: { bps: 2000, adjustBps: 1000 },
			},
		},
	]
}
