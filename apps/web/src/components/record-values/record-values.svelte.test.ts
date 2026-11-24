import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { render } from "svelte/server"
import { setTestUrl } from "../../../scripts/svelte/app-stub"
import { editSession } from "../../client/edit.svelte.js"
import { valueSheetSession as session } from "../../client/record-values.svelte.js"
import { accountValues } from "../../lib/contract"
import { NO_PROBLEMS } from "../../lib/view/record-values/draft"
import { CHART, sheetSnapshot } from "../../lib/view/record-values/fixtures.test-support"
import RecordValues from "./RecordValues.svelte"

const GOLDEN = new URL("../../../../cli/src/account/value/fixtures/values.output", import.meta.url)
const page = (accounts = CHART) =>
	render(RecordValues, { props: { snapshot: sheetSnapshot(accounts) } }).body

beforeEach(() => {
	editSession.token = "t"
	setTestUrl("http://127.0.0.1/net-worth/")
	session.show("2026-10-31")
})
afterEach(() => {
	editSession.token = null
	session.open = false
	session.date = ""
	session.against = ""
	session.values = {}
	session.saved = null
	session.problems = NO_PROBLEMS
})

describe("the Record today's values button", () => {
	test("is shown only when the server answers a session, and never in the Demo", () => {
		expect(page()).toContain("Record today's values")
		editSession.token = null
		expect(page()).not.toContain("Record today")
		editSession.token = "t"
		setTestUrl("http://127.0.0.1/net-worth/?demo=1")
		expect(page()).not.toContain("Record today")
	})
})

describe("the sheet", () => {
	test("lists each account in its group with its Balance, its last Transaction, and an empty field", () => {
		const body = page()
		for (const title of ["Cash", "Investments", "ทรัพย์สิน", "Assets", "Debts"]) {
			expect(body).toContain(`>${title}</h3>`)
		}
		expect(body).toContain("1,500.00")
		expect(body).toContain("Last transaction 30 Oct 2026")
		expect(body).toContain("No transaction since 1 Aug 2026")
		expect(body).toMatch(/<input id="value-bank" value=""/)
		expect(body).not.toContain("changed ")
	})

	test("states values as of the As-of until the date is changed", () => {
		expect(page()).toMatch(/id="value-date"[^>]*value="2026-10-31"/)
	})

	test("asks a debt for what is still owed, as a positive number, beside its field", () => {
		const body = page()
		expect(body).toContain('id="value-debt-owed"')
		expect(body).toContain("Type what you still owe, as a positive number")
		expect(body).not.toContain('id="value-bank-owed"')
	})

	test("marks a row changed once it holds a value, and the footer counts it and names the account", () => {
		session.values = { bank: "1600" }
		session.against = "gains"
		const body = page()
		expect(body).toContain('data-changed="true"')
		expect(body).toContain("1 account changed. Differences count against Gains.")
	})

	test("with no account to count against, shows the command to run and saves nothing", () => {
		const body = page(CHART.filter((a) => a.type !== "income" && a.type !== "equity"))
		expect(body).toContain('traj account add "Valuation gains" --type income --currency THB')
		expect(body).toContain("Nothing can be saved until there is one account")
		expect(body).toMatch(/<button type="submit" disabled/)
	})

	test("shows a refusal on its row", () => {
		session.problems = {
			rows: { debt: "Car Loan is a liability, so its value is what it still owes" },
		}
		const body = page()
		expect(body).toContain('id="value-debt-problem"')
		expect(body).toContain("what it still owes")
	})
})

describe("after a save", () => {
	test("shows each row as before → value with the difference traj stated, and Done", async () => {
		session.saved = accountValues.parse(JSON.parse(await Bun.file(GOLDEN).text()))
		const body = page()
		expect(body).toContain("2 recorded, 1 already at that value, nothing written.")
		expect(body).toContain("→")
		expect(body).toContain("Difference")
		expect(body).toContain("No change, nothing written")
		expect(body).toContain(">Done<")
		expect(body).not.toContain("Value as of")
	})
})

describe("a saved debt", () => {
	test("reads as a change in what you owe, and an asset's as a difference", () => {
		const entry = (id: string, name: string, index: number) => ({
			index,
			status: "added",
			account: { id, name },
			date: "2026-10-31",
			before: "10.00",
			value: "8.00",
			difference: "-2.00",
			transaction: null,
			notes: [],
		})
		session.saved = accountValues.parse({
			dryRun: false,
			file: "-",
			against: { id: "gains", name: "Gains" },
			values: [entry("debt", "Car Loan", 0), entry("bank", "Bank", 1)],
			counts: { added: 2, unchanged: 0 },
		})
		const body = page()
		expect(body).toContain("Change in what you owe")
		expect(body.match(/Difference/g)).toHaveLength(1)
	})
})

describe("the sheet at phone width", () => {
	test("fills the drawer, lets every row shrink, and holds no fixed width", () => {
		const body = page()
		expect(body).toContain("w-full")
		expect(body).toContain('class="min-w-0 space-y-6"')
		expect(body).toMatch(/<li class="min-w-0 /)
		expect(body).toMatch(/<ul class="min-w-0 /)
		expect(body).toContain("truncate")
		expect(body).toContain("sticky -bottom-5 -mx-5 -mb-5")
		expect(body).not.toMatch(/(?:w|min-w)-\[(?:[4-9]\d\d|\d{4,})px\]/)
	})
})
