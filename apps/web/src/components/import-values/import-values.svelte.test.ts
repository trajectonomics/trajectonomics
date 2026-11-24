import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { render } from "svelte/server"
import { setTestUrl } from "../../../scripts/svelte/app-stub"
import { editSession } from "../../client/edit.svelte.js"
import { importSession as session } from "../../client/import-values.svelte.js"
import { valueSheetSession } from "../../client/record-values.svelte.js"
import { targetsOf } from "../../lib/view/import-values/match"
import { parseImport } from "../../lib/view/import-values/parse"
import { CHART, sheetSnapshot } from "../../lib/view/record-values/fixtures.test-support"
import { valueSheet } from "../../lib/view/record-values/sheet"
import type { ValueSheet } from "../../lib/view/record-values/types"
import RecordValues from "../record-values/RecordValues.svelte"
import ImportWizard from "./ImportWizard.svelte"

const sheet = valueSheet(sheetSnapshot(CHART)) as ValueSheet
const TEXT =
	"Date,Bank,Fund,Savings\n2026-01-31,1000,2000,3\n2026-02-28,1100,2100,4\n03/04/2026,1,2,3"
const GOOD = TEXT.split("\n").slice(0, 3).join("\n")
const page = () => render(ImportWizard, { props: { sheet } }).body

/** What a phone needs of the markup: the drawer fills the width, and nothing inside holds a fixed one. */
function expectPhoneFit(body: string): void {
	expect(body).toContain("w-full")
	expect(body).toContain('class="min-w-0 space-y-6"')
	expect(body).not.toMatch(/(?:w|min-w)-\[(?:[4-9]\d\d|\d{4,})px\]/)
}

beforeEach(() => {
	editSession.token = "t"
	setTestUrl("http://127.0.0.1/net-worth/")
	session.show()
})
afterEach(() => {
	editSession.token = null
	session.cancel()
	valueSheetSession.against = ""
})

describe("the button", () => {
	test("sits beside Record today's values, only where an Edit is, and never in the Demo", () => {
		const body = render(RecordValues, { props: { snapshot: sheetSnapshot(CHART) } }).body
		expect(body).toContain("Import a balance history")
		editSession.token = null
		expect(render(RecordValues, { props: { snapshot: sheetSnapshot(CHART) } }).body).not.toContain(
			"Import a balance history",
		)
		editSession.token = "t"
		setTestUrl("http://127.0.0.1/net-worth/?demo=1")
		expect(render(RecordValues, { props: { snapshot: sheetSnapshot(CHART) } }).body).not.toContain(
			"Import a balance history",
		)
	})
})

describe("step 1, Load, at phone width", () => {
	test("names the layout, takes pasted text or a file, and holds Next until the table has no row to fix", () => {
		session.text = TEXT
		const body = page()
		expect(body).toContain("Step 1 of 3: Load")
		for (const label of ["Dates down", "Accounts down", "One row per value"])
			expect(body).toContain(label)
		expect(body).toContain('id="import-text"')
		expect(body).toContain('type="file"')
		expect(body).toContain("1 row to fix before you can go on.")
		expect(body).toContain("Row 4, column Date.")
		expect(body).toContain("3 april or 4 march")
		expect(body).toMatch(/<button type="submit" disabled/)
		expectPhoneFit(body)
		expect(body).toContain("break-words")
		expect(body).toContain("min-w-0")
	})

	test("says a Buddhist-era year was converted, and lets Next through once the table is good", () => {
		session.text = "Date,Bank\n2569-01-31,1"
		const body = page()
		expect(body).toContain("1 date used a Buddhist-era year (2560 to 2600) and was converted")
		expect(body).not.toMatch(/<button type="submit" disabled/)
	})
})

describe("step 2, Match, at phone width", () => {
	test("shows each column's name, count and date range, a dropdown of the ledger's accounts or Skip, and holds Next", () => {
		session.text = GOOD
		session.toMatch(parseImport(GOOD, "dates-down").sources, targetsOf(sheet))
		const body = page()
		expect(body).toContain("Step 2 of 3: Match")
		expect(body).toContain("2 values, 31 Jan 2026 to 28 Feb 2026")
		expect(body).toContain('<option value="skip">Skip</option>')
		expect(body).toContain('<optgroup label="Debts">')
		expect(body).toContain('<option value="bank" selected="">Bank</option>')
		expect(body).toContain("Match or skip every account, and match at least one, to go on.")
		expect(body).toMatch(/<button type="submit" disabled/)
		expect(body).toContain('<ul class="min-w-0 divide-y divide-border">')
		expectPhoneFit(body)
	})

	test("lets Next through when every column is matched or skipped", () => {
		session.text = GOOD
		session.toMatch(parseImport(GOOD, "dates-down").sources, targetsOf(sheet))
		session.choose("2:Savings", "skip")
		expect(page()).not.toMatch(/<button type="submit" disabled/)
	})
})

describe("step 3, Review, at phone width", () => {
	test("shows the count, the dates, the account to count against and traj's dry run, with Import held until it held", () => {
		session.text = GOOD
		session.toMatch(parseImport(GOOD, "dates-down").sources, targetsOf(sheet))
		session.choose("2:Savings", "skip")
		session.step = "review"
		valueSheetSession.against = "gains"
		session.preview = { state: "ready", added: 4, unchanged: 0 }
		const body = page()
		expect(body).toContain("Step 3 of 3: Review")
		expect(body).toContain("4 values, from 31 Jan 2026 to 28 Feb 2026")
		expect(body).toContain('<option value="gains" selected="">Gains (THB)</option>')
		expect(body).toContain("4 values would be recorded. Nothing is written until you import.")
		expect(body).not.toMatch(/<button type="button" disabled=""[^>]*>Import/)
		expectPhoneFit(body)
	})

	test("lists every refused value at its row and column, and holds Import", () => {
		session.text = GOOD
		session.toMatch(parseImport(GOOD, "dates-down").sources, targetsOf(sheet))
		session.step = "review"
		valueSheetSession.against = "gains"
		session.preview = {
			state: "refused",
			refusal: {
				values: [
					{ row: 3, column: "Fund", account: "Fund", date: "2026-02-28", message: "owes, not -5" },
				],
			},
		}
		const body = page()
		expect(body).toContain("traj refused these values. Nothing was written.")
		expect(body).toContain("Row 3, column Fund.")
		expect(body).toContain("Fund, 28 Feb 2026: owes, not -5")
		expect(body).toContain('<button type="button" disabled')
	})

	test("with no account to count against, shows the command to run and holds Import", () => {
		const bare = valueSheet(
			sheetSnapshot(CHART.filter((a) => a.type !== "income" && a.type !== "equity")),
		) as ValueSheet
		session.step = "review"
		const body = render(ImportWizard, { props: { sheet: bare } }).body
		expect(body).toContain('traj account add "Valuation gains" --type income --currency THB')
	})
})

describe("what was imported", () => {
	test("says what traj recorded, from its own counts, and offers Done", () => {
		session.text = GOOD
		session.toMatch(parseImport(GOOD, "dates-down").sources, targetsOf(sheet))
		session.step = "done"
		session.saved = {
			dryRun: false,
			file: "-",
			against: { id: "gains", name: "Gains" },
			values: [],
			counts: { added: 5, unchanged: 1 },
		}
		const body = page()
		expect(body).toContain(
			"5 recorded from 31 Jan 2026 to 28 Feb 2026, and 1 already at that value, nothing written.",
		)
		expect(body).toContain(">Done<")
		expect(body).not.toContain("Step ")
		expectPhoneFit(body)
	})
})
