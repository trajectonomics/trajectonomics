import { describe, expect, test } from "bun:test"
import type { ScenarioDocument } from "../../contract"
import { itemNames } from "../item-names"
import { baselineRead, planDocument } from "../plan-items/fixtures.test-support"
import { DEMO } from "./fixtures.test-support"
import { accountItems, flowItems } from "./plan-items"

const read = DEMO.reads.documents["base"]
if (read === undefined || !read.ok) throw new Error("the Demo holds the base document")
const doc = read.data.scenario.document
const expense = doc.flows.find((flow) => flow.kind === "expense" && flow.amount !== undefined)
const income = doc.flows.find((flow) => flow.kind === "income" && flow.amount !== undefined)
const account = doc.accounts[0]
if (expense === undefined || income === undefined || account === undefined) {
	throw new Error("the Demo has an expense, an income and an account")
}

describe("the planner cards while a session is open", () => {
	test("with no session the cards are the plan's and carry no mark", () => {
		const view = flowItems(doc, "expense", null, null)
		expect(view.marks).toEqual({})
		expect(view.cards.some((card) => card.id === expense.id)).toBe(true)
	})

	test("a Set shows the session's value, with the baseline's text struck through beside it", () => {
		const changes = { sets: [{ path: `flows.${expense.id}.amount`, value: "1.00" }], removals: [] }
		const view = flowItems(doc, "expense", null, changes)
		expect(view.cards.find((card) => card.id === expense.id)?.amount).toBe("1.00")
		expect(view.marks[expense.id]?.was.amount).toBe(expense.amount ?? "")
		expect(view.marks[expense.id]?.off).toBe(false)
		const other = view.cards.find((card) => card.id !== expense.id)
		if (other !== undefined) expect(view.marks[other.id]?.was).toEqual({})
	})

	test("a switched-off item is kept as the plan stores it, and marked off", () => {
		const changes = { sets: [], removals: [`flows.${income.id}`] }
		const view = flowItems(doc, "income", null, changes)
		const card = view.cards.find((entry) => entry.id === income.id)
		expect(card?.amount).toBe(income.amount ?? (null as never))
		expect(view.marks[income.id]).toEqual({ off: true, was: {} })
	})

	test("an Account's rate change is marked, and an Account switched off is marked off", () => {
		const changes = {
			sets: [{ path: `accounts.${account.id}.rate`, value: 12345 }],
			removals: [],
		}
		const view = accountItems(doc, DEMO.reads.baseline, changes)
		expect(view.marks[account.id]?.was.rate).toBeDefined()
		const off = accountItems(doc, DEMO.reads.baseline, {
			sets: [],
			removals: [`accounts.${account.id}`],
		})
		expect(off.marks[account.id]?.off).toBe(true)
	})
})

describe("an Account card's payout in a What-if", () => {
	const payout = { bps: "4.00", frequency: "annual", rounding: "halfUp", startAt: "retire" }
	const base = planDocument()
	const named: ScenarioDocument = {
		...base,
		milestones: [{ id: "retire", displayLabel: "Retirement" }],
		accounts: base.accounts.map((one) => (one.id === "bank" ? { ...one, payout } : one)),
	}
	const names = itemNames(new Map(), null, named)

	test("reads the plan's name for the Milestone the payout starts at, as the session shows it", () => {
		const changes = {
			sets: [{ path: "accounts.bank.payout", value: { ...payout, bps: "5.00" } }],
			removals: [],
		}
		const view = accountItems(named, baselineRead(), changes, {}, names)
		const card = view.cards.find((one) => one.id === "bank")
		expect(card?.payout?.text).toContain("Pays out 5% a year from Retirement")
	})

	test("reads the plan's name with no What-if session open", () => {
		const view = accountItems(named, baselineRead(), null, {}, names)
		expect(view.cards.find((one) => one.id === "bank")?.payout?.text).toContain("from Retirement")
	})

	test("shows the id in code when the plan states no name", () => {
		const bare = { ...named, milestones: [] }
		const changes = {
			sets: [{ path: "accounts.bank.payout", value: { ...payout, bps: "5.00" } }],
			removals: [],
		}
		const view = accountItems(bare, baselineRead(), changes, {}, itemNames(new Map(), null, bare))
		const card = view.cards.find((one) => one.id === "bank")
		expect(card?.payout?.parts).toContainEqual({
			item: { text: "retire", named: false, kind: "milestone", id: "retire" },
		})
	})
})
