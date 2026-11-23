// The allowances page against the real traj: a plan worked by hand for one tax year, read through the loopback
// editor, tried as a what-if, kept with Add to plan, and saved from a what-if (cli ADR 0061, ADR 0062).
import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import { type AllowanceFlow, projectionRun, readOf } from "../src/lib/contract"
import type { EditAnswer } from "../src/lib/edit/answer"
import { allowancesView, suggestionAdditions } from "../src/lib/view/allowances"
import { pathNamed } from "../src/lib/what-if/answer"
import { readsOf } from "../src/lib/what-if/lens"
import {
	disposeAllowances,
	editorOf,
	PLAN,
	setupAllowances,
	storedPlan,
} from "./allowances-ledger.test-support"
import { allowancesOf, post, snapshotOf, tryWhatIf } from "./allowances-requests.test-support"
import { SLOW_MS } from "./edit-fixture.test-support"
import { editRequest } from "./edit-request.test-support"

const RMF = "allowance.retirement.rmf"
const ESG = "allowance.thai_esg"
const INPUTS = { labels: [RMF, ESG], step: "1000", budget: null, minSaving: null }

beforeAll(async () => {
	await setupAllowances()
}, SLOW_MS)
afterAll(disposeAllowances)

describe("a reread body is a closed shape", () => {
	const refused = async (body: string) => {
		const response = await editorOf().reread(editRequest({}, body), 4321)
		const answer = (await response.json()) as { ok: boolean; error: { code: string } }
		return { status: response.status, ok: answer.ok, code: answer.error.code }
	}

	test("another field, text that is not JSON, and a body nested too deep are refused with 400", async () => {
		const deep = `{"allowances":${"[".repeat(100)}${"]".repeat(100)}}`
		for (const body of ['{"kind":"delete-plan"}', "not json", deep]) {
			expect(await refused(body)).toMatchObject({ status: 400, ok: false, code: "invalid_reread" })
		}
	})

	test("a step of one major unit or less is refused before it is kept, as the CLI refuses it", async () => {
		for (const step of ["0", "1", "1.00", "0.5"]) {
			const body = JSON.stringify({ allowances: { ...INPUTS, step } })
			expect(await refused(body)).toMatchObject({ status: 400, ok: false })
		}
	})
})

describe("the allowances of a hand-worked Thai year", () => {
	test(
		"before the person chooses, the Snapshot holds no allowance read",
		async () => {
			const answer = await post("reread", {})
			expect(snapshotOf(answer).reads.allowances).toEqual({})
			expect(snapshotOf(answer).params.allowances).toBeNull()
		},
		SLOW_MS,
	)

	test(
		"reading RMF then ThaiESG states the tax due, the extra each could take and the saving, as worked by hand",
		async () => {
			const answer = await post("reread", { allowances: INPUTS })
			const view = allowancesView(allowancesOf(answer))
			expect(view.current).toMatchObject({
				dueBefore: "20300.00",
				dueAfter: "0.00",
				saving: "20300.00",
			})
			const [rmf, esg] = view.current?.lines ?? []
			expect(rmf).toMatchObject({
				name: "RMF",
				planned: "12000.00",
				extra: "168000.00",
				saving: "14800.00",
			})
			expect(esg).toMatchObject({
				name: "ThaiESG",
				planned: "0.00",
				extra: "110000.00",
				saving: "5500.00",
			})
			// No contribution carries the ThaiESG label, so that suggestion has no Account and says why,
			// while the RMF one still has its Account and is offered.
			expect(view.current?.addable).toBe(true)
			expect(view.current?.unplaced.map((one) => one.name)).toEqual(["ThaiESG"])
			expect(esg?.hint).toContain("No contribution of this plan carries allowance.thai_esg")
		},
		SLOW_MS,
	)

	test(
		"a step the CLI refuses stays in the Snapshot as that read's own error, and the plan is kept",
		async () => {
			// THB has two decimal places, so the CLI refuses a third; a step of one unit or less never gets this far.
			const answer = await post("reread", { allowances: { ...INPUTS, step: "1000.123" } })
			const { reads } = snapshotOf(answer)
			expect(reads.allowances[PLAN]?.ok).toBe(false)
			expect(reads.projections[PLAN]?.ok).toBe(true)
		},
		SLOW_MS,
	)
})

describe("trying and keeping the RMF suggestion", () => {
	let flows: AllowanceFlow[] = []
	const suggestedFlows = (answer: EditAnswer) => [
		...(allowancesView(allowancesOf(answer)).current?.flows ?? []),
	]

	test(
		"Try as what-if reads the plan with the Flow added and writes nothing",
		async () => {
			const answer = await post("reread", { allowances: { ...INPUTS, labels: [RMF] } })
			flows = suggestedFlows(answer)
			expect(flows).toHaveLength(1)
			const before = storedPlan()
			const tried = await tryWhatIf({
				plan: PLAN,
				sets: [],
				removals: [],
				additions: suggestionAdditions(flows),
			})
			const run = tried.ok ? readOf(projectionRun).parse(tried.reads.projection) : null
			if (run === null || !run.ok) throw new Error("the what-if did not read")
			expect(run.argv.some((token) => token.startsWith("--add=flows="))).toBe(true)
			expect(run.data.additions?.[0]?.path).toBe(`flows.${flows[0]?.id}`)
			// 168,000.00 more brings the tax from 20,300.00 to 5,500.00, as worked by hand.
			expect(run.data.taxYears.find((year) => year.from === "2027-01-01")?.due).toBe("5500.00")
			// The page shows a read only when the contract parses it, so each must hold the echoed Addition.
			const lens = readsOf(tried)
			expect(lens.run).not.toBeNull()
			expect(lens.fi).not.toBeNull()
			expect(lens.compare?.sides.b.additions?.[0]?.path).toBe(`flows.${flows[0]?.id}`)
			expect(storedPlan()).toEqual(before)
		},
		SLOW_MS,
	)

	test(
		"an Addition whose id the plan already holds is refused at that item",
		async () => {
			const tried = await tryWhatIf({
				plan: PLAN,
				sets: [],
				removals: [],
				additions: [{ list: "flows", item: { ...flows[0], id: "rmf" } }],
			})
			const read = tried.ok ? tried.reads.projection : null
			if (read === null || read.ok) throw new Error("the what-if was not refused")
			expect(pathNamed(read.error)).toBe("flows.rmf")
		},
		SLOW_MS,
	)

	test(
		"a what-if saved as a new plan carries the Addition",
		async () => {
			const saved = await post("edit", {
				kind: "copy-plan",
				from: PLAN,
				name: "hand-tried",
				additions: suggestionAdditions(flows),
			})
			expect(saved.ok).toBe(true)
			expect(storedPlan("hand-tried").document.flows.map((flow) => flow.id)).toContain(
				flows[0]?.id ?? "",
			)
		},
		SLOW_MS,
	)

	test(
		"Add to plan writes the Flow with one apply-plan Edit, after which the page shows no extra RMF for the year",
		async () => {
			const { hash, document } = storedPlan()
			const next = { ...document, flows: [...document.flows, ...flows] }
			const answer = await post("edit", {
				kind: "apply-plan",
				name: PLAN,
				contentHash: hash,
				document: next,
			})
			expect(answer.ok).toBe(true)
			expect(storedPlan().document.flows.map((flow) => flow.id)).toContain(flows[0]?.id ?? "")
			const view = allowancesView(allowancesOf(answer)).current
			expect(view?.lines[0]).toMatchObject({ planned: "180000.00", extra: "0.00", saving: "0.00" })
			expect(view?.flows).toEqual([])
			expect(view?.dueBefore).toBe("5500.00")
		},
		SLOW_MS,
	)
})
