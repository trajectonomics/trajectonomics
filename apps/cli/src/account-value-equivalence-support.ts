import { expect } from "bun:test"
import { oraclePlan } from "./account/value/oracle.test-support"
import { planValues } from "./account/value/plan"
import type { ValueRequest } from "./account/value/types"
import { type AppError, isAppError } from "./errors"
import { mustOpen } from "./store/testing"
import type { PlannedRead } from "./store/tx-planning"
import type { Traj } from "./tx-test-support"

/** The most a Balance can hold, in baht: 2^53 - 1 satang. */
export const MOST = "90071992547409.91"

export type Entry = { account: string; date: string; value: string }

export const requestOf = (values: readonly Entry[]): ValueRequest => ({
	against: "Gains",
	entries: values.map((entry, index) => ({ ...entry, index })),
	path: (index, field) => `document.values.${index}.${field}`,
	againstPath: "document.against",
	batch: true,
})

/** What the plan reads, taken inside the one write a real plan would read it in. */
export function readOf(home: string): PlannedRead {
	let read: PlannedRead | undefined
	const store = mustOpen(home)
	store.writePlanned(
		(seen) => {
			read = seen
			return { writes: [], value: null }
		},
		{ dryRun: true },
	)
	store.close()
	return read!
}

/** The body of a refusal; `toEqual` cannot compare two AppErrors, which keep it private. */
export function bodyOf(plan: unknown) {
	expect(isAppError(plan)).toBe(true)
	return (plan as AppError).body
}

/** A transaction a person recorded with `tx add`, dated between the dates a batch will state. */
export async function own(traj: Traj, from: string, to: string, amount: string, date: string) {
	const flags = ["--from", from, "--to", to, "--amount", amount, "--date", date]
	expect((await traj(["tx", "add", ...flags, "--json"])).code).toBe(0)
}

/** The plan the running Balance makes and the plan the full rescan makes, for one request. */
export function bothPlans(home: string, values: readonly Entry[]) {
	const request = requestOf(values)
	const read = readOf(home)
	return { fast: planValues(request)(read), slow: oraclePlan(request, read) }
}
