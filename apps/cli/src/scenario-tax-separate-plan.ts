import { SAVINGS, TWO_SALARIES } from "./scenario-tax-filers-support"

/* The plans the tests of the separate Return share (cli ADR-0075). */

export const LABELS: readonly string[] = [
	"--label",
	"salary=income.section40_1",
	"--label",
	"partner-salary=income.section40_1",
]

/** `LABELS` and the shared bonus of `BARE_PLAN`. */
export const BONUS_LABELS: readonly string[] = [...LABELS, "--label", "bonus=income.section40_1"]

/** One income Flow of a year's pay, with whatever else it states. */
export function pay(id: string, satang: number, extra: object = {}): Record<string, unknown> {
	return {
		id,
		kind: "income",
		earned: true,
		amount: satang,
		frequency: "annual",
		start: "2026-01-01",
		end: "2026-12-31",
		growth: { bps: 0 },
		...extra,
	}
}

/** Two owned salaries and a bonus. */
export const BARE_PLAN: Record<string, unknown> = {
	...TWO_SALARIES,
	flows: [pay("salary", 100_000_000), pay("partner-salary", 50_000_000), pay("bonus", 10_000_000)],
}

/** The holder's and the partner's salaries, a bonus the two share, and the savings they share. */
export const BONUS_OWNERS: { path: string; person: string }[] = [
	{ path: "flows.salary", person: "me" },
	{ path: "flows.partner-salary", person: "partner" },
	{ path: "flows.bonus", person: "shared" },
	{ path: `accounts.${SAVINGS}`, person: "shared" },
]

/** A Levy of the caller's own, which `scenario tax` must leave alone. */
export function ownLevy(id: string): Record<string, unknown> {
	return {
		id,
		period: { month: 1, day: 1 },
		settlement: { month: 3, day: 31 },
		measures: [
			{ id: "base", op: "const", value: 0 },
			{ id: "due", op: "const", value: 0 },
		],
		due: "due",
	}
}
