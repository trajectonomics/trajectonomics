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

	test("holds Back and the account to count against while traj checks, and says how many", () => {
		session.text = GOOD
		session.toMatch(parseImport(GOOD, "dates-down").sources, targetsOf(sheet))
		session.choose("2:Savings", "skip")
		session.step = "review"
		session.preview = { state: "running" }
		const body = page()
		expect(body).toContain("Checking 4 values…")
		expect(body).toMatch(/<select id="import-against" disabled/)
		expect(body).toMatch(/<button type="button" disabled=""[^>]*>Back/)
	})

	test("says the import is running, and holds Back and Cancel", () => {
		session.text = GOOD
		session.toMatch(parseImport(GOOD, "dates-down").sources, targetsOf(sheet))
		session.choose("2:Savings", "skip")
		session.step = "review"
		session.committing = true
		const body = page()
		session.committing = false
		expect(body).toContain("Importing 4 values. This can take a minute.")
		expect(body).toMatch(/<button type="button" disabled=""[^>]*>Cancel/)
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
