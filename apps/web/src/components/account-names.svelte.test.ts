import { afterAll, beforeEach, describe, expect, test } from "bun:test"
import { render } from "svelte/server"
import { snapshotLoader } from "../client/browser"
import { replaceSnapshot } from "../client/snapshot.svelte"
import type { AccountList, Snapshot } from "../lib/contract"
import { netWorthPageView } from "../lib/view/net-worth/page"
import { LOADING } from "../lib/view/state"
import { DEMO } from "../lib/view/what-if/fixtures.test-support"
import AssumptionsBody from "./assumptions/AssumptionsBody.svelte"
import NetWorthContent from "./net-worth/NetWorthContent.svelte"
import PlanItemsBody from "./plan-items/PlanItemsBody.svelte"

/** The id the Demo gives the Account of that name: ids are the CLI's, so a test reads them and never spells them. */
function idOf(name: string): string {
	const read = DEMO.reads.accounts
	const found = read.ok ? read.data.accounts.find((account) => account.name === name) : undefined
	if (found === undefined) throw new Error(`the Demo has an Account ${name}`)
	return found.id
}

const BANK = idOf("Bank")
const FUND = idOf("Fund")

/** The Demo with the accounts Read changed by `change`, as a rename in the ledger would give after a reread. */
function withAccounts(
	change: (accounts: AccountList["accounts"]) => AccountList["accounts"],
): Snapshot {
	const read = DEMO.reads.accounts
	if (!read.ok) throw new Error("the Demo reads its accounts")
	return {
		...DEMO,
		reads: {
			...DEMO.reads,
			accounts: { ...read, data: { ...read.data, accounts: change(read.data.accounts) } },
		},
	}
}

beforeEach(() => replaceSnapshot(DEMO))
afterAll(() => snapshotLoader.replace(LOADING))

const assets = (snapshot: Snapshot) =>
	render(PlanItemsBody, { props: { snapshot, kind: "assets", scenario: "base", editable: true } })
		.body
const assumptions = (snapshot: Snapshot) =>
	render(AssumptionsBody, { props: { snapshot, scenario: "base", editable: true } }).body

describe("accounts are named by their ledger name", () => {
	test("an Account card heads with its ledger name and the Edit button says it, never the id", () => {
		const body = assets(DEMO)
		expect(body).toContain(`<span data-account="${BANK}">Bank</span>`)
		expect(body).toContain('aria-label="Edit Bank"')
		expect(body).not.toContain(`aria-label="Edit ${BANK}`)
	})

	test("an Account only the plan has shows its id as code", () => {
		const body = assets(DEMO)
		expect(body).toMatch(/<code[^>]*data-account="condo"[^>]*data-unnamed[^>]*>condo<\/code>/)
	})

	test("the Assumptions rows head with the ledger name", () => {
		const body = assumptions(DEMO)
		expect(body).toContain(`<span data-account="${FUND}">Fund</span>`)
		expect(body).not.toContain(`>${FUND}<`)
	})

	test("the Net worth page keeps the ledger name of each row", () => {
		const view = netWorthPageView(DEMO)
		if (!view.netWorth.ok) throw new Error("the Demo reads net worth")
		const body = render(NetWorthContent, { props: { view } }).body
		expect(body).toContain(">Bank<")
	})

	test("after a rename in the ledger, the new Snapshot names the Account by its new name", () => {
		const renamed = withAccounts((accounts) =>
			accounts.map((account) => (account.id === BANK ? { ...account, name: "Everyday" } : account)),
		)
		replaceSnapshot(renamed)
		const body = assets(renamed)
		expect(body).toContain('aria-label="Edit Everyday"')
		expect(body).not.toContain('aria-label="Edit Bank"')
	})

	test("two Accounts with one name are told apart by their parent", () => {
		const doubled = withAccounts((accounts) => {
			const parent = accounts[0]
			if (parent === undefined) throw new Error("the Demo lists accounts")
			return [
				...accounts.map((account) => {
					if (account.id === BANK) return { ...account, name: "Savings", parentId: "p-a" }
					return account.id === FUND ? { ...account, name: "Savings", parentId: "p-b" } : account
				}),
				{ ...parent, id: "p-a", name: "Bank A", parentId: null },
				{ ...parent, id: "p-b", name: "Bank B", parentId: null },
			]
		})
		replaceSnapshot(doubled)
		const body = assets(doubled)
		expect(body).toContain("Bank A › Savings")
		expect(body).toContain("Bank B › Savings")
	})
})
