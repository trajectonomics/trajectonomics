import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { accountValues } from "../lib/contract"
import { writtenRereadFailed } from "../lib/edit/failure"
import { targetsOf } from "../lib/view/import-values/match"
import { parseImport } from "../lib/view/import-values/parse"
import { importPlan } from "../lib/view/import-values/plan"
import { NO_PROBLEMS } from "../lib/view/record-values/draft"
import { valueSheet } from "../lib/view/record-values/sheet"
import type { ValueSheet } from "../lib/view/record-values/types"
import { DEMO } from "../lib/view/what-if/fixtures.test-support"
import { editSession } from "./edit.svelte.js"
import { importSession } from "./import-values.svelte.js"
import { valueSheetSession } from "./record-values.svelte.js"

const GOLDEN = new URL("../../../cli/src/account/value/fixtures/values.output", import.meta.url)
const result = accountValues.parse(JSON.parse(await Bun.file(GOLDEN).text()))
/** A batch that landed while the Snapshot read after it failed, with what it wrote. */
const LANDED = { ok: false, error: writtenRereadFailed(), result }
const sheet = valueSheet(DEMO) as ValueSheet
const idOf = (name: string) =>
	sheet.groups.flatMap((g) => g.rows).find((row) => row.name === name)?.id ?? ""
const against = sheet.choices.find((choice) => choice.name === "Fund Return")?.id ?? ""
const TEXT = "Date\tBank\tCar Loan\tOld\n2026-01-31\t1,000.50\t500\t7\n2026-02-28\t1,100\t450\t8"
const realFetch = globalThis.fetch

/** Answers every Edit with the landed answer, and keeps what the page sent. */
function lands(): void {
	globalThis.fetch = (async () => new Response(JSON.stringify(LANDED))) as unknown as typeof fetch
}

beforeEach(() => {
	editSession.token = "token"
	valueSheetSession.against = against
})
afterEach(() => {
	editSession.token = null
	editSession.clear()
	editSession.savedUnread = false
	globalThis.fetch = realFetch
	valueSheetSession.saved = null
	valueSheetSession.close()
	valueSheetSession.against = ""
	valueSheetSession.problems = NO_PROBLEMS
	importSession.cancel()
})

describe("a value batch that landed while its read failed", () => {
	test("the sheet shows what traj stated, with no problem on any row", async () => {
		valueSheetSession.show(sheet.asOf)
		valueSheetSession.values = { [idOf("Bank")]: "1200.50" }
		lands()
		await valueSheetSession.save(sheet)
		expect(valueSheetSession.saved).toEqual(result)
		expect(valueSheetSession.problems).toEqual(NO_PROBLEMS)
	})

	test("the wizard reaches its done step with what traj stated", async () => {
		importSession.show()
		importSession.text = TEXT
		const parsed = parseImport(importSession.text, importSession.layout)
		importSession.toMatch(parsed.sources, targetsOf(sheet))
		importSession.choose("2:Old", "skip")
		lands()
		await importSession.commit(importPlan(parsed, importSession.matches), sheet)
		expect(importSession.step).toBe("done")
		expect(importSession.saved).toEqual(result)
	})
})
