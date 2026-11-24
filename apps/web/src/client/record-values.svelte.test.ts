import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { accountValues } from "../lib/contract"
import { NO_PROBLEMS } from "../lib/view/record-values/draft"
import { valueSheet } from "../lib/view/record-values/sheet"
import type { ValueSheet } from "../lib/view/record-values/types"
import { DEMO } from "../lib/view/what-if/fixtures.test-support"
import { editSession } from "./edit.svelte.js"
import { valueSheetSession as session } from "./record-values.svelte.js"

const GOLDEN = new URL("../../../cli/src/account/value/fixtures/values.output", import.meta.url)
const sheet = valueSheet(DEMO) as ValueSheet
const idOf = (name: string) =>
	sheet.groups.flatMap((g) => g.rows).find((r) => r.name === name)?.id ?? ""
const against = sheet.choices.find((choice) => choice.name === "Fund Return")?.id ?? ""
const realFetch = globalThis.fetch
let sent: unknown[] = []

/** Answers every Edit with the given body, and keeps what the page sent. */
function answerWith(body: unknown): void {
	globalThis.fetch = (async (_url: string, init: RequestInit) => {
		sent.push(JSON.parse(String(init.body)))
		return new Response(JSON.stringify(body))
	}) as unknown as typeof fetch
}

beforeEach(() => {
	editSession.token = "token"
	sent = []
	session.show(sheet.asOf)
	session.against = against
	session.values = { [idOf("Bank")]: " 1200.50 ", [idOf("Car Loan")]: "-5", [idOf("Fund")]: "" }
})
afterEach(() => {
	editSession.token = null
	editSession.clear()
	globalThis.fetch = realFetch
	session.saved = null
	session.close()
	session.against = ""
	session.problems = NO_PROBLEMS
})

describe("saving the sheet", () => {
	test("sends the changed rows as one record-values Edit, the values as typed, and no empty row", async () => {
		answerWith({ ok: false, error: { code: "x", exitCode: 1, message: "no" } })
		await session.save(sheet)
		expect(sent).toEqual([
			{
				kind: "record-values",
				against,
				values: [
					{ account: idOf("Bank"), date: sheet.asOf, value: "1200.50" },
					{ account: idOf("Car Loan"), date: sheet.asOf, value: "-5" },
				],
			},
		])
	})

	test("puts a refusal on the row its index names, and keeps what was typed", async () => {
		answerWith({
			ok: false,
			error: {
				code: "valuation_value_negative",
				exitCode: 3,
				message: "The values were rejected and nothing was written.",
				details: {
					values: [{ index: 1, reason: { message: "document.values.1.value: owes, not -5" } }],
				},
			},
		})
		await session.save(sheet)
		expect(session.problems.rows).toEqual({ [idOf("Car Loan")]: "owes, not -5" })
		expect(session.saved).toBeNull()
		expect(session.values[idOf("Bank")]).toBe(" 1200.50 ")
	})

	test("keeps what traj stated after a save, and forgets what was typed on Done but not the account", async () => {
		const result = accountValues.parse(JSON.parse(await Bun.file(GOLDEN).text()))
		answerWith({ ok: true, snapshot: DEMO, result })
		await session.save(sheet)
		expect(session.saved?.counts).toEqual(result.counts)
		session.close()
		expect(session.open).toBe(false)
		expect(session.values).toEqual({})
		expect(session.saved).toBeNull()
		expect(session.against).toBe(against)
	})

	test("sends nothing when no account to count against is chosen", async () => {
		session.against = ""
		answerWith({ ok: false, error: { code: "x", exitCode: 1, message: "no" } })
		await session.save(sheet)
		expect(sent).toEqual([])
		expect(session.problems.against).toContain("Choose the account")
	})
})
