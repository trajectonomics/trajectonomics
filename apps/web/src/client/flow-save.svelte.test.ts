import { describe, expect, test } from "bun:test"
import { type ScenarioFlow, scenarioDocument } from "../lib/contract"
import { scenarioFlow } from "../lib/contract/scenario-show"
import { employerOf } from "../lib/view/plan-items/employer"
import { employerDraftOf } from "../lib/view/plan-items/employer-draft"
import { planDocument } from "../lib/view/plan-items/fixtures.test-support"
import { type FlowDraft, flowDraftOf } from "../lib/view/plan-items/flows"
import { fieldOfRefusal, namedRefusal } from "../lib/view/plan-items/refusal"
import { lensDocument, NO_CHANGES } from "../lib/what-if/lens-document"
import { editSession } from "./edit.svelte.js"
import { saveFlow } from "./flow-save.js"
import { whatIfSession } from "./what-if.svelte.js"
import { HASH, useSessionHooks } from "./what-if.test-support"

useSessionHooks()

const base = planDocument()
const doc = scenarioDocument.parse({
	...base,
	accounts: [...base.accounts, { id: "fund", kind: "asset", rate: 300 }],
	flows: [
		...base.flows,
		{
			id: "salary-employer",
			kind: "contribution",
			target: "fund",
			funding: "employer",
			frequency: "monthly",
			start: "2026-11-01",
			end: "2050-05-14",
			derive: {
				measures: [
					{ id: "pay", op: "flow", flow: "salary" },
					{ id: "share", op: "scale", of: "pay", num: 500, den: 10000, rounding: "floor" },
				],
				result: "share",
			},
		},
	],
})
const salary = doc.flows.find((one) => one.id === "salary")

/** Tries the salary as the drawer does: the drafts start from the session's view of the employer, and `edit` changes some fields. */
async function trySalary(edit: {
	amount?: string
	share?: string
	rounding?: string
}): Promise<void> {
	const shown = lensDocument(doc, whatIfSession.changesFor("base") ?? NO_CHANGES)
	const draft = {
		...flowDraftOf(salary),
		...(edit.amount === undefined ? {} : { amount: edit.amount }),
	}
	const stored = employerDraftOf(employerOf(shown.flows, "salary"))
	const employer = {
		...stored,
		...(edit.share === undefined ? {} : { share: edit.share }),
		...(edit.rounding === undefined ? {} : { rounding: edit.rounding }),
	}
	const saved = await saveFlow({
		name: "base",
		contentHash: HASH,
		doc,
		kind: "income",
		existing: salary,
		draft,
		employer,
		tryValue: true,
	})
	expect(saved.done).toBe(true)
}

const paths = () => whatIfSession.whatIf?.sets.map((set) => set.path).sort()

/** Tries an edited Flow as the drawer does, and returns the session's Sets by path. */
async function tryFlow(
	existing: ScenarioFlow | undefined,
	draft: FlowDraft,
): Promise<Map<string, unknown>> {
	const saved = await saveFlow({
		name: "base",
		contentHash: HASH,
		doc,
		kind: "income",
		existing,
		draft,
		employer: employerDraftOf(null),
		tryValue: true,
	})
	expect(saved.done).toBe(true)
	return new Map((whatIfSession.whatIf?.sets ?? []).map((set) => [set.path, set.value] as const))
}

describe("trying a once value on a Flow whose stored end would be left behind", () => {
	test("a monthly Flow tried once sends its end as its start, which the CLI accepts", async () => {
		const sets = await tryFlow(salary, { ...flowDraftOf(salary), frequency: "once" })
		expect(sets.get("flows.salary.frequency")).toBe("once")
		// A what-if cannot clear the stored end, and `traj` refuses a once Flow that keeps it (ONCE_FLOW_END_MISMATCH).
		expect(sets.get("flows.salary.end")).toBe("2026-11-01")
	})

	test("moving a once Flow's date moves its end with it, so neither END_BEFORE_START nor ONCE_FLOW_END_MISMATCH is refused", async () => {
		const once = scenarioFlow.parse({
			id: "bonus",
			kind: "income",
			frequency: "once",
			start: "2027-01-01",
			end: "2027-01-01",
			amount: "1000.00",
			earned: false,
		})
		const sets = await tryFlow(once, { ...flowDraftOf(once), start: "2027-02-01" })
		expect(sets.get("flows.bonus.start")).toBe("2027-02-01")
		expect(sets.get("flows.bonus.end")).toBe("2027-02-01")
	})
})

describe("trying a salary after trying what its employer adds", () => {
	test("an amount and then an employer share keep both", async () => {
		await trySalary({ amount: "95000.00" })
		await trySalary({ share: "7" })
		expect(paths()).toEqual(["flows.salary-employer.derive", "flows.salary.amount"])
	})

	test("an employer share and then an amount keep both, because the form starts from the share already tried", async () => {
		await trySalary({ share: "7" })
		await trySalary({ amount: "95000.00" })
		expect(paths()).toEqual(["flows.salary-employer.derive", "flows.salary.amount"])
	})

	test("a share and then a rounding keep both", async () => {
		await trySalary({ share: "7" })
		await trySalary({ rounding: "ceil" })
		const derive = whatIfSession.whatIf?.sets.find((set) => set.path.endsWith("derive"))?.value
		expect(JSON.stringify(derive)).toContain('"num":700')
		expect(JSON.stringify(derive)).toContain('"rounding":"ceil"')
	})
})

/** Saves the form while the server refuses the Edit at the Flow in this position, and names the refusal as the form does. */
async function refusedAt(
	position: (sent: string[]) => number,
	field: string,
	form: {
		existing: typeof salary
		draft: ReturnType<typeof flowDraftOf>
		employer: ReturnType<typeof employerDraftOf>
	},
) {
	let sentIds: string[] = []
	globalThis.fetch = (async (_url: unknown, init?: RequestInit) => {
		const edit = JSON.parse(String(init?.body)) as { document: { flows: { id: string }[] } }
		sentIds = edit.document.flows.map((flow) => flow.id)
		const path = `document.flows.${position(sentIds)}.${field}`
		return Response.json({
			ok: false,
			error: { code: "invalid_input", exitCode: 2, message: "no", path },
		})
	}) as typeof fetch
	const saved = await saveFlow({
		name: "base",
		contentHash: HASH,
		doc,
		kind: "income",
		tryValue: false,
		...form,
	})
	return { saved, sentIds, refusal: namedRefusal(editSession.failure, saved.sent) }
}

describe("a refusal's position names the Flow of the document the Edit sent", () => {
	test("clearing the employer section sends no employer Flow, and the position still names the right Flow", async () => {
		const employer = employerDraftOf(null)
		const { saved, sentIds, refusal } = await refusedAt((sent) => sent.length - 1, "amount", {
			existing: salary,
			draft: flowDraftOf(salary),
			employer,
		})
		expect(saved.sent).toEqual(sentIds)
		expect(sentIds).not.toContain("salary-employer")
		const last = sentIds[sentIds.length - 1]
		expect(refusal?.path).toBe(`document.flows.${last}.amount`)
		expect(fieldOfRefusal(refusal, ["amount"])).toBe("amount")
	})

	test("a new income whose name is taken is salary-2, and its employer Flow is named salary-2-employer", async () => {
		const draft = {
			...flowDraftOf(undefined),
			name: "Salary",
			amount: "1000.00",
			start: "2026-11-01",
		}
		const employer = { account: "fund", share: "5", rounding: "floor" }
		const { saved, refusal } = await refusedAt(
			(sent) => sent.length - 1,
			"derive.measures.1.rounding",
			{
				existing: undefined,
				draft,
				employer,
			},
		)
		expect(saved.sent.slice(-2)).toEqual(["salary-2", "salary-2-employer"])
		expect(refusal?.path).toBe("document.flows.salary-2-employer.derive.measures.1.rounding")
		expect(fieldOfRefusal(refusal, ["employerAccount", "employerRounding"])).toBe(
			"employerRounding",
		)
	})
})
