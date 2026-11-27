// The guided plan against the real traj, over a 12-month ledger: the plan and its household land, a taken name
// and a refused household write nothing, and another plan's hash does not move (web ADR 0031).
import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import { accountList, scenarioList, scenarioShow } from "../src/lib/contract"
import { type GuidedEdit, guidedEditSchema } from "../src/lib/edit/guided-edit"
import { BINARY, SLOW_MS } from "./edit-fixture.test-support"
import {
	AS_OF,
	disposeGuidedLedger,
	guidedEnv,
	setupGuidedLedger,
	trajText,
} from "./guided-ledger.test-support"
import type { RunContext } from "./run-traj"
import { runEdit } from "./serve-apply"

/** The one person of the household: a holder who stops working at 60. */
const ME = { id: "me", role: "holder", born: "1990-06", lifeExpectancy: 90 } as const

let context: RunContext
let salary = ""
let food = ""

/** A guided plan's answers, from the two rows the ledger states. */
function editOf(name: string, person = "me"): GuidedEdit {
	return guidedEditSchema.parse({
		kind: "start-guided-plan",
		name,
		asOf: AS_OF,
		money: {
			from: "history",
			rows: [
				{ id: salary, keep: true },
				{ id: food, keep: true },
			],
		},
		people: [ME],
		stopWork: { person, age: 60 },
	})
}

/** Every stored plan, as traj lists it. */
async function list() {
	return scenarioList.parse(JSON.parse(await trajText(["scenario", "list", "--json"]))).scenarios
}

/** Applies the plain template under a name: a plan of that name with no household. */
async function plainPlan(name: string): Promise<void> {
	const template = JSON.parse(
		await trajText(["scenario", "apply", "--template", "--as-of", AS_OF, "--decimal", "--json"]),
	) as string
	await trajText(["scenario", "apply", name, "--file", "-", "--decimal", "--json"], template)
}

/** One plan as traj shows it, in its decimal form. */
async function shown(name: string) {
	return scenarioShow.parse(
		JSON.parse(await trajText(["scenario", "show", "--decimal", "--json", "--", name])),
	).scenario
}

beforeAll(async () => {
	await setupGuidedLedger()
	const accounts = accountList.parse(
		JSON.parse(await trajText(["account", "list", "--json"])),
	).accounts
	const idOf = (name: string) => {
		const account = accounts.find((one) => one.name === name)
		if (account === undefined) throw new Error(`the fixture ledger has no ${name}`)
		return account.id
	}
	salary = idOf("Salary")
	food = idOf("Food")
	context = { binary: BINARY, env: guidedEnv() }
}, SLOW_MS)

afterAll(disposeGuidedLedger)

describe("a guided plan against the real traj", () => {
	test(
		"the plan is saved with its household, and the age anchor dates the stop-work Milestone",
		async () => {
			const run = await runEdit(context, editOf("guided"))
			if (!run.ok) throw new Error(run.error.message)
			const plan = await shown("guided")
			const flows = plan.document.flows
			const income = flows.find((flow) => flow.id === salary)
			expect(income?.amount).toBe("50000.00")
			expect(income?.earned).toBe(true)
			expect(income?.endAt).toBe("stop-work")
			expect(flows.find((flow) => flow.id === food)?.amount).toBe("15000.00")
			expect(flows.find((flow) => flow.id === food)?.endAt).toBeUndefined()
			expect(plan.household?.people).toEqual([ME])
			expect(plan.household?.anchors).toEqual([
				{ path: "milestones.stop-work.criteria.age.on", person: "me", age: 60 },
			])
			const milestone = plan.document.milestones?.[0] as {
				id: string
				criteria: { id: string; on: string }[]
			}
			expect(milestone.id).toBe("stop-work")
			expect(milestone.criteria[0]?.on).toBe("2050-06-30")
		},
		SLOW_MS,
	)

	test(
		"a name a plan already holds is refused by the dry run, and nothing is written",
		async () => {
			await plainPlan("held")
			const before = await list()
			const again = await runEdit(context, editOf("held"))
			expect(again.ok).toBe(false)
			if (!again.ok) {
				expect(again.error.code).toBe("scenario_name_taken")
				expect(again.error.message).toBe("A plan named held already exists.")
			}
			expect(await list()).toEqual(before)
		},
		SLOW_MS,
	)

	test(
		"a refused household removes the plan it just made, and the list is unchanged",
		async () => {
			const before = await list()
			const refused = await runEdit(context, editOf("ghost", "nobody"))
			expect(refused.ok).toBe(false)
			if (!refused.ok) {
				expect(refused.error.code).toBe("invalid_input")
				expect(refused.error.path).toBe("document.anchors.0.person")
			}
			expect(await list()).toEqual(before)
		},
		SLOW_MS,
	)

	test(
		"another plan's content hash does not move when a guided plan is saved",
		async () => {
			await plainPlan("other")
			const hashOf = async () => (await list()).find((plan) => plan.name === "other")?.contentHash
			const before = await hashOf()
			expect((await runEdit(context, editOf("shiny"))).ok).toBe(true)
			expect(await hashOf()).toBe(before)
		},
		SLOW_MS,
	)
})
