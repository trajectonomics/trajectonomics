// A reread that changes only the chance inputs, against the real traj (web ADR 0018): the three stage-one checks and the
// chance reads run, every other Read is kept as it was, a plan changed since the Snapshot was read makes a full read, and
// the partial answer equals the full one. The timings are printed for the ADR.
import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import type { Snapshot } from "../src/lib/contract"
import { calls, clearCalls } from "./allowances-spy.test-support"
import {
	disposeAssumptions,
	ids,
	logOf,
	PLAN,
	post,
	setupAssumptions,
	storedPlan,
	terminal,
} from "./assumptions-ledger.test-support"
import { SLOW_MS } from "./edit-fixture.test-support"

const FIRST = { paths: 200, seed: "0123456789abcdef" }
const SECOND = { paths: 1000, seed: "fedcba9876543210" }
const CHECK = ["scenario list", "account list", "report networth"]

/** One reread, and the Snapshot it answers. */
async function reread(body: unknown): Promise<Snapshot> {
	const answer = await post("reread", body)
	if (!answer.ok) throw new Error(answer.error.message)
	return answer.snapshot
}

/** The Snapshot without its chance reads and inputs: everything a chance change must leave alone. */
function others(snapshot: Snapshot): string {
	const { chance: _reads, ...reads } = snapshot.reads
	const { chance: _inputs, ...params } = snapshot.params
	return JSON.stringify({ ...snapshot, params, reads })
}

const chanceRuns = (ran: string[]) => ran.filter((line) => line.startsWith("projection chance"))
const checksOf = (ran: string[]) =>
	ran
		.filter((line) => !line.startsWith("projection chance"))
		.map((line) => CHECK.find((prefix) => line.startsWith(prefix)))

beforeAll(async () => {
	await setupAssumptions()
	const { fund } = ids()
	const stored = storedPlan()
	const document = {
		...stored.document,
		accounts: stored.document.accounts.map((a) => (a.id === fund ? { ...a, volatility: 1500 } : a)),
	}
	const saved = await post("edit", {
		kind: "apply-plan",
		name: PLAN,
		contentHash: stored.hash,
		document,
	})
	if (!saved.ok) throw new Error(saved.error.message)
}, SLOW_MS)
afterAll(disposeAssumptions)

describe("a reread that changes only the chance inputs", () => {
	test(
		"runs the three checks and the chance reads, and keeps every other Read as it was",
		async () => {
			const before = await reread({ chance: FIRST })
			await clearCalls(logOf())
			const after = await reread({ chance: SECOND })
			const ran = await calls(logOf())
			expect(chanceRuns(ran)).toHaveLength(1)
			expect(checksOf(ran)).toEqual(CHECK)
			expect(ran.some((line) => line.startsWith("projection run"))).toBe(false)
			expect(others(after)).toBe(others(before))
			expect(after.params.chance).toEqual({ source: "plan", ...SECOND })
			const read = after.reads.chance[PLAN]
			expect(read?.ok && read.data.paths).toBe(SECOND.paths)
			expect(JSON.stringify(after.reads.chance)).not.toBe(JSON.stringify(before.reads.chance))
		},
		SLOW_MS,
	)

	test(
		"a partial reread equals a full read of the same inputs",
		async () => {
			await clearCalls(logOf())
			const kept = await reread({ chance: FIRST })
			expect(chanceRuns(await calls(logOf()))).toHaveLength(1)
			await clearCalls(logOf())
			const full = await reread({})
			expect((await calls(logOf())).some((line) => line.startsWith("projection run"))).toBe(true)
			expect(JSON.stringify(kept)).toBe(JSON.stringify(full))
		},
		SLOW_MS,
	)

	test(
		"states the allowance inputs and the chance inputs together: both are kept, and no plan is read again",
		async () => {
			await clearCalls(logOf())
			const after = await reread({ allowances: null, chance: SECOND })
			expect(chanceRuns(await calls(logOf()))).toHaveLength(1)
			expect(after.params.allowances).toBeNull()
			expect(after.params.chance).toEqual({ source: "plan", ...SECOND })
		},
		SLOW_MS,
	)
})

describe("a reread after the ledger moved", () => {
	test(
		"a plan changed from a terminal makes a full read, with the new document and the chance inputs",
		async () => {
			const before = await reread({ chance: FIRST })
			const { fund } = ids()
			const stored = storedPlan()
			terminal(["scenario", "apply", PLAN, "--file", "-", "--decimal", "--json"], {
				...stored.document,
				accounts: stored.document.accounts.map((a) =>
					a.id === fund ? { ...a, volatility: 800 } : a,
				),
			})
			await clearCalls(logOf())
			const after = await reread({ chance: SECOND })
			const ran = await calls(logOf())
			expect(ran.some((line) => line.startsWith("projection run"))).toBe(true)
			expect(after.reads.documents[PLAN]).not.toEqual(before.reads.documents[PLAN])
			const read = after.reads.chance[PLAN]
			expect(read?.ok && read.data.returnModel?.accounts.map((a) => a.volatility)).toEqual([800])
		},
		SLOW_MS,
	)
})

describe("what a chance change costs", () => {
	test(
		"takes about as long as the chance read alone, far less than a full read",
		async () => {
			const timed = async (work: () => Promise<unknown>) => {
				const start = performance.now()
				await work()
				return Math.round(performance.now() - start)
			}
			await reread({ chance: FIRST })
			const full = await timed(() => reread({}))
			const kept = await timed(() => reread({ chance: SECOND }))
			console.log(`full read ${full} ms, chance change ${kept} ms`)
			expect(kept).toBeLessThan(full)
		},
		SLOW_MS,
	)
})
