// The Assumptions page against the real traj (cli ADR 0068, web ADR 0018): inflation, a return and a volatility on two
// Accounts are one apply-plan Edit; the chance of success is read from the plan's own model and the Chance page says so; a
// lower volatility is tried in a what-if without a write; a refusal lands on its row. Each test sets up its own state.
import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import { render } from "svelte/server"
import ChanceResult from "../src/components/chance/ChanceResult.svelte"
import type { ProjectionChance } from "../src/lib/contract"
import type { EditAnswer } from "../src/lib/edit/answer"
import { formatShare } from "../src/lib/format"
import { documentFromDraft } from "../src/lib/view/assumptions/build"
import { type AssumptionsDraft, draftOf } from "../src/lib/view/assumptions/draft"
import { assumptionFieldOfRefusal } from "../src/lib/view/assumptions/refusal"
import { chanceViewOf } from "../src/lib/view/chance/page"
import {
	disposeAssumptions,
	ids,
	PATHS,
	PLAN,
	post,
	SEED,
	setupAssumptions,
	storedPlan,
	tryWhatIf,
} from "./assumptions-ledger.test-support"
import { SLOW_MS } from "./edit-fixture.test-support"

beforeAll(async () => {
	await setupAssumptions()
}, SLOW_MS)
afterAll(disposeAssumptions)

const slow = (name: string, run: () => Promise<void>) => test(name, run, SLOW_MS)

/** The page's Save: the typed texts moved into the stored document, sent as one Edit that names the hash it read. */
async function save(change: (draft: AssumptionsDraft) => void): Promise<EditAnswer> {
	const stored = storedPlan()
	const draft = draftOf(stored.document)
	change(draft)
	const made = documentFromDraft(stored.document, draft)
	if (!made.ok) throw new Error(JSON.stringify(made.problems))
	return post("edit", {
		kind: "apply-plan",
		name: PLAN,
		contentHash: stored.hash,
		document: made.document,
	})
}

/** Inflation, and a return and a volatility on the bank and the fund, typed as a person types them. */
const typed = (draft: AssumptionsDraft, fund = "15") => {
	draft.inflation = "3"
	const [bank, other] = draft.accounts
	if (bank) Object.assign(bank, { rate: "1.5", volatility: "1" })
	if (other)
		Object.assign(other, { rate: "6", volatility: fund, fee: { rate: "1.5", rounding: "floor" } })
}

function chanceOf(answer: EditAnswer): ProjectionChance {
	if (!answer.ok) throw new Error(answer.error.message)
	const read = answer.snapshot.reads.chance[PLAN]
	if (read === undefined || !read.ok) throw new Error(`no chance read: ${JSON.stringify(read)}`)
	return read.data
}

describe("the Assumptions page through traj", () => {
	slow(
		"states the paths and the seed with a reread, and a plan with no volatility says so in the CLI's words",
		async () => {
			const answer = await post("reread", { chance: { paths: PATHS, seed: SEED } })
			if (!answer.ok) throw new Error(answer.error.message)
			expect(answer.snapshot.params.chance).toEqual({ source: "plan", paths: PATHS, seed: SEED })
			const read = answer.snapshot.reads.chance[PLAN]
			expect(read?.ok).toBe(false)
			if (read && !read.ok) expect(read.error.message).toContain("volatility")
		},
	)

	slow(
		"one Edit sets inflation, a return and a volatility on two Accounts, and the Chance page reads the plan's model",
		async () => {
			const { bank, fund } = ids()
			await post("reread", { chance: { paths: PATHS, seed: SEED } })
			const answer = await save((draft) => typed(draft))
			const stored = storedPlan().document
			expect(stored.economy).toEqual({ inflation: 300 })
			expect(stored.accounts.find((a) => a.id === fund)?.fee).toMatchObject({ rounding: "floor" })
			expect(
				stored.accounts.filter((a) => a.kind === "asset").map((a) => [a.id, a.rate, a.volatility]),
			).toEqual([
				[bank, 150, 100],
				[fund, 600, 1500],
			])
			const chance = chanceOf(answer)
			expect(chance.paths).toBe(PATHS)
			expect(chance.definition).toMatchObject({ seed: SEED, modelId: "plan-256" })
			expect(chance.returnModel).toEqual({
				source: "plan",
				buckets: 256,
				accounts: [
					{ id: bank, rate: 150, volatility: 100 },
					{ id: fund, rate: 600, volatility: 1500 },
				],
			})
			expect(chance.bands.length).toBeGreaterThan(0)
			const html = render(ChanceResult, {
				props: { argv: [], plan: PLAN, futures: null, view: chanceViewOf(chance) },
			}).body
			expect(html).toContain(formatShare(chance.successBps))
			expect(html).toContain("Built from your plan")
			expect(html).toContain(`${fund}: returns 6.00% a year, swings 15.00%`)
		},
	)

	slow(
		"a lower volatility tried in a what-if gives other Bands from the plan's model, and writes nothing",
		async () => {
			const { fund } = ids()
			await save((draft) => typed(draft))
			const before = storedPlan()
			const base = chanceOf(await post("reread", {}))
			const answer = await tryWhatIf({
				plan: PLAN,
				sets: [{ path: `accounts.${fund}.volatility`, value: 500 }],
				removals: [],
				additions: [],
			})
			if (!answer.ok) throw new Error(answer.error.message)
			const tried = answer.reads.chance
			if (tried === null || !tried.ok)
				throw new Error(`the what-if has no chance: ${JSON.stringify(tried)}`)
			const data = tried.data as ProjectionChance
			expect(data.returnModel?.accounts.find((a) => a.id === fund)?.volatility).toBe(500)
			expect(JSON.stringify(data.bands)).not.toBe(JSON.stringify(base.bands))
			expect(storedPlan()).toEqual(before)
		},
	)

	slow(
		"a volatility the plan does not state is added by a what-if, and inflation is replaced where the plan states one",
		async () => {
			const { bank } = ids()
			await save((draft) => {
				draft.inflation = "3"
				for (const row of draft.accounts) row.volatility = row.id === bank ? "" : "15"
			})
			const answer = await tryWhatIf({
				plan: PLAN,
				sets: [
					{ path: `accounts.${bank}.volatility`, value: 800 },
					{ path: "economy.inflation", value: 500 },
				],
				removals: [],
				additions: [],
			})
			if (!answer.ok) throw new Error(answer.error.message)
			expect(answer.reads.projection?.ok).toBe(true)
			const tried = answer.reads.chance
			expect(tried?.ok).toBe(true)
		},
	)

	slow(
		"a value out of range is refused by the CLI at the row its path names, and nothing is written",
		async () => {
			const { fund } = ids()
			const before = storedPlan()
			const answer = await save((draft) => {
				const row = draft.accounts.find((a) => a.id === fund)
				if (row) row.volatility = "150"
			})
			if (answer.ok) throw new Error("the CLI took a volatility of 150 percent")
			const names = storedPlan().document.accounts.map((a) => a.id)
			expect(assumptionFieldOfRefusal(answer.error, names)).toBe(`volatility:${fund}`)
			expect(storedPlan()).toEqual(before)
		},
	)

	slow("a save that names an old hash is refused as the plan moved on", async () => {
		const stale = storedPlan().hash
		await save((draft) => typed(draft, "12"))
		const answer = await post("edit", {
			kind: "apply-plan",
			name: PLAN,
			contentHash: stale,
			document: storedPlan().document,
		})
		if (answer.ok) throw new Error("the CLI took a stale save")
		expect(answer.error.code).toBe("scenario_changed")
	})
})
