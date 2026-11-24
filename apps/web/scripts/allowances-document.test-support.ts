// The hand-worked 2027 plan of the allowances tests, made from the demo ledger's `base` plan.
import type { ScenarioDocument } from "../src/lib/contract"

/** `base` with its loans and economy taken away, one salary and one RMF contribution for the year starting `start`. */
export function handDocument(base: ScenarioDocument, start: string): object {
	const [bank, fund] = base.accounts
	if (bank === undefined || fund === undefined) throw new Error("the demo plan has its accounts")
	const document = {
		...base,
		accounts: base.accounts.filter(
			(account) => account.id !== "condo" && account.id !== "condo-loan",
		),
		economy: { inflation: 0 },
		cashflow: { surplus: [{ account: bank.id }], contribute: [fund.id], withdraw: [bank.id] },
		flows: [
			{
				id: "salary",
				kind: "income",
				earned: true,
				frequency: "monthly",
				start: start,
				end: "2027-12-31",
				amount: "50000.00",
				growth: { bps: 0 },
			},
			{
				id: "rmf",
				kind: "contribution",
				target: fund.id,
				frequency: "monthly",
				start: start,
				end: "2027-12-31",
				amount: "1000.00",
				growth: { bps: 0 },
			},
		],
	}
	delete (document as { milestones?: unknown }).milestones
	return document
}
