import { describe, expect, test } from "bun:test"
import { labelWithNames } from "../../what-if/change-names"
import type { Change } from "../../what-if/session"
import { type ItemNames, NO_PEOPLE } from "../item-names"
import { pnlView } from "../ledger/pnl"
import { assetBars } from "../net-worth/composition"
import { row } from "../overview/fixtures.test-support"
import { NO_NAMES } from "./names"

const NAMES = new Map([
	["id-Savings", "Bank A › Savings"],
	["acct-1", "Bank"],
])

/** The item lookup the bar reads: the ledger's Account names, and the labels the plan's document states. */
const ITEMS: ItemNames = {
	accounts: NAMES,
	people: NO_PEOPLE,
	flows: new Map([["rent", "School fees"]]),
	milestones: new Map(),
}

describe("every surface that prints an account takes the shared names", () => {
	test("the net worth bar labels an Account by the shared label, so two of one name differ", () => {
		const [bar] = assetBars([row("Savings", "asset", "5.00")], NAMES)
		expect(bar?.segments[0]?.label).toBe("Bank A › Savings")
	})

	test("without a name for the id, a result's own name for the Account shows", () => {
		const [bar] = assetBars([row("Savings", "asset", "5.00")], NO_NAMES)
		expect(bar?.segments[0]?.label).toBe("Savings")
	})

	test("a profit and loss line is named by the shared label", () => {
		const view = pnlView(
			{
				since: null,
				until: "2026-10-31",
				project: null,
				rows: [row("Savings", "income", "-5.00")],
				totals: [],
			},
			NAMES,
		)
		expect(view.income[0]?.account).toBe("Bank A › Savings")
	})
})

describe("the What-if bar names an Account by its ledger name", () => {
	test("a switched-off Account, a set field and a tried Account lead with the name", () => {
		const off: Change = { kind: "off", path: "accounts.acct-1", label: "Acct-1 switched off" }
		const set: Change = {
			kind: "set",
			path: "accounts.acct-1.rate",
			label: "Acct-1 rate set to 300",
			value: "300",
		}
		expect(labelWithNames(off, ITEMS)).toBe("Bank switched off")
		expect(labelWithNames(set, ITEMS)).toBe("Bank rate set to 300")
	})

	test("a loan group names its Account, and an unnamed Flow's change is as it was", () => {
		const group: Change = {
			kind: "group",
			path: "loan:acct-1",
			label: "Loan acct-1 switched off",
			parts: [],
		}
		const flow: Change = { kind: "off", path: "flows.gym", label: "Gym switched off" }
		expect(labelWithNames(group, ITEMS)).toBe("Loan Bank switched off")
		expect(labelWithNames(flow, ITEMS)).toBe("gym switched off")
	})

	test("a Flow the document labels shows its label in the bar", () => {
		const flow: Change = { kind: "off", path: "flows.rent", label: "Rent switched off" }
		expect(labelWithNames(flow, ITEMS)).toBe("School fees switched off")
	})

	test("a salary group names its Flow in place of the id", () => {
		const group: Change = {
			kind: "group",
			path: "salary:rent",
			label: "Rent and its employer share switched off",
			parts: [],
		}
		const unnamed: Change = {
			kind: "group",
			path: "salary:gym",
			label: "Gym and its employer share switched off",
			parts: [],
		}
		expect(labelWithNames(group, ITEMS)).toBe("School fees and its employer share switched off")
		expect(labelWithNames(unnamed, ITEMS)).toBe("gym and its employer share switched off")
	})

	test("a Milestone the document labels shows its label in the bar", () => {
		const milestone: Change = {
			kind: "set",
			path: "milestones.condo.combine",
			label: 'Condo combine set to "any"',
			value: '"any"',
		}
		const named: ItemNames = {
			...ITEMS,
			milestones: new Map([["condo", "Condo down payment"]]),
		}
		expect(labelWithNames(milestone, named)).toBe('Condo down payment combine set to "any"')
	})

	test("an Account the ledger does not name keeps its id", () => {
		const off: Change = { kind: "off", path: "accounts.condo", label: "Condo switched off" }
		expect(labelWithNames(off, ITEMS)).toBe("condo switched off")
	})

	test("a Milestone a Flow starts or ends at shows its name in place of the id", () => {
		const start: Change = {
			kind: "set",
			path: "flows.rent.startAt",
			label: "Rent startAt set to retire",
			value: "retire",
		}
		const named: ItemNames = {
			...ITEMS,
			milestones: new Map([["retire", "Retirement"]]),
		}
		expect(labelWithNames(start, named)).toBe("School fees startAt set to Retirement")
		expect(labelWithNames(start, ITEMS)).toBe("School fees startAt set to retire")
		const end: Change = {
			kind: "set",
			path: "flows.rent.endAt",
			label: "Rent endAt set to retire",
			value: "retire",
		}
		expect(labelWithNames(end, named)).toBe("School fees endAt set to Retirement")
	})
})
