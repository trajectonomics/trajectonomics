import type { Household } from "./scenario/household/model"
import { HOLDER, shown } from "./scenario-household-support"

/** The fixtures of the employer rule's tests (cli ADR-0048): a salary, and the shares that read it. */

export const SHARE = {
	measures: [
		{ id: "pay", op: "flow", flow: "salary" },
		{ id: "share", op: "scale", of: "pay", num: 5, den: 100, rounding: "floor" },
	],
	result: "share",
} as const

export const SALARY = {
	id: "salary",
	kind: "income",
	earned: true,
	amount: 100_000,
	frequency: "monthly",
	growth: "inflation",
	start: "2026-01-01",
	end: "2040-01-01",
} as const

export const contribution = (
	id: string,
	extra: Record<string, unknown>,
): Record<string, unknown> => ({
	id,
	kind: "contribution",
	target: "pension",
	frequency: "monthly",
	start: "2026-01-01",
	end: "2040-01-01",
	derive: SHARE,
	...extra,
})

/** A salary, and `flows` after it, over a cash and a pension account. */
export function plan(...flows: unknown[]): Record<string, unknown> {
	return {
		schemaVersion: 4,
		currency: "THB",
		economy: { inflation: 0 },
		accounts: [
			{ id: "cash", kind: "asset", rate: 0 },
			{ id: "pension", kind: "asset", rate: 0 },
		],
		flows: [SALARY, ...flows],
		cashflow: {
			surplus: [{ account: "cash" }],
			contribute: ["pension"],
			withdraw: ["cash"],
		},
	}
}

export function retiresAt(age: number): Household {
	return {
		schemaVersion: 1,
		people: [HOLDER],
		anchors: [{ path: "flows.salary.end", person: "me", age }],
	}
}

export type Flows = Record<string, unknown>[]

export async function flowsAfter(home: string): Promise<Flows> {
	return (await shown(home)).document.flows
}
