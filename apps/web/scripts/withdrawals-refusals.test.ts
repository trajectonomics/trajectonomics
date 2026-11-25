// The rule's refusals against the real traj: each is in the CLI's own words, and its path names the form field it is
// shown at (cli ADR 0063, web ADR 0013).
import { afterAll, afterEach, beforeAll, describe, expect, test } from "bun:test"
import { scenarioDocument } from "../src/lib/contract"
import { layoutOf, withdrawalFieldOfRefusal } from "../src/lib/view/withdrawals/refusal"
import { SLOW_MS } from "./edit-fixture.test-support"
import { settle } from "./editor-running.test-support"
import {
	AS_OF,
	accountIds,
	disposeWithdrawals,
	PLAN,
	setupWithdrawals,
	storedPlan,
} from "./withdrawals-ledger.test-support"
import { post } from "./withdrawals-requests.test-support"

const ID = "retirement-spending"
/** A test against the real CLI: a fresh ledger takes a while per Edit. */
const slow = (name: string, run: () => Promise<void>) => test(name, run, SLOW_MS)

beforeAll(async () => {
	await setupWithdrawals()
}, SLOW_MS)
afterAll(disposeWithdrawals)
afterEach(settle, SLOW_MS)

describe("the rule's refusals are in the CLI's words, at the field the path names", () => {
	/** The refusal of a document the form could not make, sent as the page's Edit would send it. */
	async function refused(
		change: (doc: Record<string, unknown>, rule: Record<string, unknown>) => void,
	) {
		const { bank } = accountIds()
		const doc = JSON.parse(JSON.stringify(storedPlan().document)) as Record<string, unknown> & {
			flows: Record<string, unknown>[]
			accounts: Record<string, unknown>[]
		}
		doc.accounts.push(
			{ id: "vault", kind: "asset", rate: 0, liquid: false },
			{ id: "debt", kind: "liability", rate: 500 },
		)
		const rule = { kind: "currentRate", portfolio: [bank], rateBps: "4.00", rounding: "floor" }
		doc.flows = doc.flows.filter((flow) => flow["id"] !== ID)
		doc.flows.push({
			id: ID,
			kind: "expense",
			frequency: "annual",
			start: AS_OF,
			startAt: "retire",
			rule,
		})
		change(doc, rule)
		const document = scenarioDocument.parse(doc)
		const answer = await post("edit", {
			kind: "apply-plan",
			name: PLAN,
			contentHash: storedPlan().hash,
			document,
		})
		if (answer.ok) throw new Error("the CLI took it")
		return { error: answer.error, layout: layoutOf(document, ID, []) }
	}
	const field = async (change: Parameters<typeof refused>[0]) => {
		const { error, layout } = await refused(change)
		return { field: withdrawalFieldOfRefusal(error, layout), message: error.message }
	}

	slow(
		"a liability, an illiquid Account, a floor above the ceiling and a weekly Flow",
		async () => {
			expect(await field((_, rule) => (rule["portfolio"] = ["debt"]))).toMatchObject({
				field: "portfolio",
				message: expect.stringContaining("liability"),
			})
			expect(await field((_, rule) => (rule["portfolio"] = ["vault"]))).toMatchObject({
				field: "portfolio",
				message: expect.stringContaining("liquid: false"),
			})
			const bounds = (_: unknown, rule: Record<string, unknown>) => {
				rule["floor"] = { amount: "900.00", growth: "inflation" }
				rule["ceiling"] = { amount: "100.00", growth: "inflation" }
			}
			expect(await field(bounds)).toMatchObject({
				field: "floor",
				message: expect.stringContaining("floor is above its ceiling"),
			})
			const weekly = (doc: Record<string, unknown>) => {
				const flow = (doc["flows"] as Record<string, unknown>[]).find((one) => one["id"] === ID)
				if (flow) flow["frequency"] = "weekly"
			}
			expect(await field(weekly)).toMatchObject({
				field: "frequency",
				message: expect.stringContaining("neither monthly nor annual"),
			})
		},
	)

	slow(
		"a next12Months Metric beside a rule Flow gated on another Milestone is shown at the start",
		async () => {
			const gated = (doc: Record<string, unknown>) => {
				doc["milestones"] = [
					{
						id: "retire",
						combine: "all",
						criteria: [{ id: "date", kind: "date", on: "2027-06-01" }],
					},
					{
						id: "other",
						combine: "all",
						criteria: [
							{
								id: "x",
								kind: "multiple",
								metric: "netWorth",
								op: "atLeast",
								base: { expenses: "next12Months" },
								num: 25,
								den: 1,
								terms: "nominal",
							},
						],
					},
				]
			}
			expect(await field(gated)).toMatchObject({
				field: "start",
				message: expect.stringContaining("next12Months"),
			})
		},
	)
})
