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

describe("the dialogs", () => {
	test("the Record sheet and the import wizard are named by their own headings", () => {
		const body = render(RecordValues, { props: { snapshot: sheetSnapshot(CHART) } }).body
		const labels = [...body.matchAll(/<dialog[^>]*aria-labelledby="([^"]+)"/g)].map(
			(match) => match[1],
		)
		expect(labels).toHaveLength(2)
		expect(new Set(labels).size).toBe(2)
		const names = labels.map((id) => new RegExp(`id="${id}"[^>]*>([^<]+)</h2>`).exec(body)?.[1])
		expect([...names].sort()).toEqual(["Import a balance history", "Record today's values"])
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

	test("says debts are entered as positive amounts, suggests CSV UTF-8, and counts in the right number", () => {
		session.text = "Date,Bank\n2026-01-31,1"
		const body = page()
		expect(body).toContain("A debt is entered as what is still owed, a positive number.")
		expect(body).toContain("CSV UTF-8")
		expect(body).toContain("1 value in 1 account.")
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

	test("tells a debt's row that its amount is what is still owed, and names each select by its place", () => {
		session.text = "Date,Car Loan,คอนโด\n2026-01-31,1,2"
		session.toMatch(parseImport(session.text, "dates-down").sources, targetsOf(sheet))
		const body = page()
		expect(body).toContain(
			"A debt is entered as what is still owed, a positive number. traj refuses a negative one.",
		)
		expect(body).toContain('id="import-match-0"')
		expect(body).toContain('id="import-match-1"')
	})

	test("lets Next through when every column is matched or skipped", () => {
		session.text = GOOD
		session.toMatch(parseImport(GOOD, "dates-down").sources, targetsOf(sheet))
		session.choose("2:Savings", "skip")
		expect(page()).not.toMatch(/<button type="submit" disabled/)
	})
})
