// A salary and its employer share switch together (issue #638): a stored share leaves with the salary, and a share the
// session adds is held out of what traj reads until the salary is back. The plan is read through POST /what-if with the
// real built traj, so a Removal traj refuses (UNKNOWN_FLOW) fails the test.
import { afterAll, afterEach, beforeAll, describe, expect, test } from "bun:test"
import type { ProjectionRun } from "../src/lib/contract"
import { type ScenarioDocument, scenarioDocument } from "../src/lib/contract"
import { scenarioFlow } from "../src/lib/contract/scenario-show"
import type { Json } from "../src/lib/what-if/json"
import { lensReadsOf } from "../src/lib/what-if/lens"
import {
	overridesOf,
	startWhatIf,
	withAddition,
	withGroupOff,
	withoutGroup,
} from "../src/lib/what-if/session"
import { SLOW_MS } from "./edit-fixture.test-support"
import { settle } from "./editor-running.test-support"
import { disposeWithdrawals, setupWithdrawals, storedPlan } from "./withdrawals-ledger.test-support"
import { post, tryWhatIf } from "./withdrawals-requests.test-support"

const PLAN = "spend"
const SALARY = "job"
const SHARE = "job-employer"
const SECOND = "side-job"
const SECOND_SHARE = "side-job-employer"
const SPEC = {
	kind: "salary",
	name: SALARY,
	paths: [`flows.${SALARY}`, `flows.${SHARE}`],
} as const
const SECOND_SPEC = {
	kind: "salary",
	name: SECOND,
	paths: [`flows.${SECOND}`, `flows.${SECOND_SHARE}`],
} as const

beforeAll(async () => {
	await setupWithdrawals()
}, SLOW_MS)
afterAll(disposeWithdrawals)
afterEach(settle, SLOW_MS)

const slow = (name: string, run: () => Promise<void>) => test(name, run, SLOW_MS)

/** The money a run states: its annual roll-up, its cash-flow totals and its tax years. */
function moneyOf(run: ProjectionRun): unknown {
	return {
		annual: run.tables.find((table) => table.name === "annual"),
		totals: run.tables.find((table) => table.name === "cashflowTotals"),
		taxYears: run.taxYears,
	}
}

/** The plan with a salary and the share its employer pays, saved once and read again for each test. */
let planned: { hash: string; document: ScenarioDocument } | null = null

async function planWithSalary(): Promise<{ hash: string; document: ScenarioDocument }> {
	if (planned !== null) return planned
	const before = storedPlan()
	const [bank] = before.document.accounts
	if (bank === undefined) throw new Error("the plan has its accounts")
	const document = scenarioDocument.parse({
		...before.document,
		flows: [
			...before.document.flows,
			{
				id: SALARY,
				kind: "income",
				frequency: "monthly",
				start: "2027-01-01",
				end: "2027-05-31",
				amount: "50000.00",
				growth: "inflation",
				earned: true,
			},
			{
				id: SECOND,
				kind: "income",
				frequency: "monthly",
				start: "2027-01-01",
				end: "2027-05-31",
				amount: "20000.00",
				growth: "inflation",
				earned: true,
			},
			{
				id: SHARE,
				kind: "contribution",
				target: bank.id,
				funding: "employer",
				frequency: "monthly",
				start: "2027-01-01",
				end: "2027-05-31",
				derive: {
					measures: [
						{ id: "pay", op: "flow", flow: SALARY },
						{ id: "share", op: "scale", of: "pay", num: 500, den: 10000, rounding: "floor" },
					],
					result: "share",
				},
			},
		],
	})
	const answer = await post("edit", {
		kind: "apply-plan",
		name: PLAN,
		contentHash: before.hash,
		document,
	})
	expect(answer.ok).toBe(true)
	planned = storedPlan()
	return planned
}

describe("a salary switched off with its employer share", () => {
	slow("a stored share leaves with it, and traj takes both Removals", async () => {
		const { hash } = await planWithSalary()
		const session = withGroupOff(startWhatIf(PLAN, hash), SPEC, SPEC.paths)
		const overrides = overridesOf(session)
		expect(overrides).toEqual({
			sets: [],
			removals: [`flows.${SALARY}`, `flows.${SHARE}`],
			additions: [],
		})
		const lens = lensReadsOf(await tryWhatIf({ plan: PLAN, ...overrides }))
		if (lens.run === null) throw new Error("traj refused the salary and its share")
		expect(lens.run.removals).toEqual(overrides.removals)
		// Both leave the projection, and the unit's switch back on is the plan's own run.
		const plan = lensReadsOf(await tryWhatIf({ plan: PLAN, sets: [], removals: [] }))
		if (plan.run === null) throw new Error("the plan's own run was refused")
		expect(moneyOf(lens.run)).not.toEqual(moneyOf(plan.run))
		const back = lensReadsOf(
			await tryWhatIf({
				plan: PLAN,
				...overridesOf(withoutGroup(session, `salary:${SALARY}`)),
			}),
		)
		if (back.run === null) throw new Error("traj refused the salary switched back on")
		expect(moneyOf(back.run)).toEqual(moneyOf(plan.run))
	})

	slow(
		"a share the session adds is held while the salary is off, and comes back with it",
		async () => {
			const { hash } = await planWithSalary()
			const [bank] = storedPlan().document.accounts
			if (bank === undefined) throw new Error("the plan has its accounts")
			const share = scenarioFlow.parse({
				id: SECOND_SHARE,
				kind: "contribution",
				target: bank.id,
				funding: "employer",
				frequency: "monthly",
				start: "2027-01-01",
				end: "2027-05-31",
				derive: {
					measures: [
						{ id: "pay", op: "flow", flow: SECOND },
						{ id: "share", op: "scale", of: "pay", num: 500, den: 10000, rounding: "floor" },
					],
					result: "share",
				},
			})
			const item = JSON.parse(JSON.stringify(share)) as Record<string, Json>
			const withShare = withAddition(startWhatIf(PLAN, hash), { list: "flows", item })
			const off = withGroupOff(withShare, SECOND_SPEC, SECOND_SPEC.paths)
			// The plan does not hold the Addition, so it is held rather than sent: a Removal of its id would be refused.
			expect(overridesOf(off)).toEqual({ sets: [], removals: [`flows.${SECOND}`], additions: [] })
			const whileOff = lensReadsOf(await tryWhatIf({ plan: PLAN, ...overridesOf(off) }))
			if (whileOff.run === null) throw new Error("traj refused the salary on its own")
			const back = overridesOf(withoutGroup(off, `salary:${SECOND}`))
			expect(back.removals).toEqual([])
			expect(back.additions).toEqual([{ list: "flows", item }])
			const whileOn = lensReadsOf(await tryWhatIf({ plan: PLAN, ...back }))
			if (whileOn.run === null) throw new Error("traj refused the added share")
			expect(whileOn.run.additions?.map((one) => one.path)).toEqual([`flows.${SECOND_SHARE}`])
		},
	)
})
