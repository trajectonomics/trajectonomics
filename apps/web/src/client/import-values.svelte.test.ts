import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { accountValues } from "../lib/contract"
import { targetsOf } from "../lib/view/import-values/match"
import { parseImport } from "../lib/view/import-values/parse"
import { importPlan } from "../lib/view/import-values/plan"
import { NO_PROBLEMS } from "../lib/view/record-values/draft"
import { valueSheet } from "../lib/view/record-values/sheet"
import type { ValueSheet } from "../lib/view/record-values/types"
import { DEMO } from "../lib/view/what-if/fixtures.test-support"
import { editSession } from "./edit.svelte.js"
import { importSession as session } from "./import-values.svelte.js"
import { valueSheetSession } from "./record-values.svelte.js"

const GOLDEN = new URL("../../../cli/src/account/value/fixtures/values.output", import.meta.url)
const sheet = valueSheet(DEMO) as ValueSheet
const targets = targetsOf(sheet)
const idOf = (name: string) => targets.find((target) => target.name === name)?.id ?? ""
const against = sheet.choices.find((choice) => choice.name === "Fund Return")?.id ?? ""
const TEXT = "Date\tBank\tCar Loan\tOld\n2026-01-31\t1,000.50\t500\t7\n2026-02-28\t1,100\t450\t8"
const realFetch = globalThis.fetch
let sent: Record<string, unknown>[] = []

/** Answers every request with the given body, and keeps what the page sent. */
function answerWith(body: unknown): void {
	globalThis.fetch = (async (_url: string, init: RequestInit) => {
		sent.push(JSON.parse(String(init.body)))
		return new Response(JSON.stringify(body))
	}) as unknown as typeof fetch
}

/** The draft in the wizard's hands as the components compute it. */
function draft() {
	const parsed = parseImport(session.text, session.layout)
	return { parsed, plan: importPlan(parsed, session.matches) }
}

beforeEach(() => {
	editSession.token = "token"
	sent = []
	session.show()
	session.text = TEXT
	valueSheetSession.against = against
})
afterEach(() => {
	editSession.token = null
	editSession.clear()
	globalThis.fetch = realFetch
	session.cancel()
	valueSheetSession.against = ""
	valueSheetSession.problems = NO_PROBLEMS
})

describe("the match", () => {
	test("chooses the accounts whose exact name states them, and leaves the rest to the person", () => {
		session.toMatch(draft().parsed.sources, targets)
		expect(session.step).toBe("match")
		expect(session.matches).toEqual({ "0:Bank": idOf("Bank"), "1:Car Loan": idOf("Car Loan") })
	})
})

describe("the review", () => {
	test("asks traj for the dry run alone, with the whole batch in date order, and writes nothing", async () => {
		session.toMatch(draft().parsed.sources, targets)
		session.choose("2:Old", "skip")
		answerWith({
			ok: true,
			preview: true,
			result: accountValues.parse(JSON.parse(await Bun.file(GOLDEN).text())),
		})
		await session.toReview(draft().plan, sheet)
		expect(sent).toHaveLength(1)
		expect(sent[0]).toEqual({
			kind: "record-values",
			against,
			preview: true,
			values: [
				{ account: idOf("Bank"), date: "2026-01-31", value: "1000.50" },
				{ account: idOf("Car Loan"), date: "2026-01-31", value: "500" },
				{ account: idOf("Bank"), date: "2026-02-28", value: "1100" },
				{ account: idOf("Car Loan"), date: "2026-02-28", value: "450" },
			],
		})
		expect(session.step).toBe("review")
		expect(session.preview).toMatchObject({ state: "ready", added: 2, unchanged: 1 })
		expect(session.saved).toBeNull()
	})

	test("lists a refused value at its row and column, and nothing is written", async () => {
		session.toMatch(draft().parsed.sources, targets)
		session.choose("2:Old", "skip")
		answerWith({
			ok: false,
			error: {
				code: "valuation_value_negative",
				exitCode: 3,
				message: "The values were rejected and nothing was written.",
				details: {
					values: [{ index: 3, reason: { message: "document.values.3.value: owes, not 450" } }],
				},
			},
		})
		await session.toReview(draft().plan, sheet)
		expect(session.preview).toMatchObject({
			state: "refused",
			refusal: {
				values: [{ row: 3, column: "Car Loan", account: "Car Loan", date: "2026-02-28" }],
			},
		})
		expect(session.saved).toBeNull()
	})

	test("does not ask while no account to count against is chosen", async () => {
		valueSheetSession.against = ""
		session.toMatch(draft().parsed.sources, targets)
		session.choose("2:Old", "skip")
		await session.toReview(draft().plan, sheet)
		expect(sent).toEqual([])
		expect(session.preview).toEqual({ state: "idle" })
	})
})

describe("Import and Cancel", () => {
	test("Import sends the same Edit without preview, and shows what traj stated", async () => {
		session.toMatch(draft().parsed.sources, targets)
		session.choose("2:Old", "skip")
		const result = accountValues.parse(JSON.parse(await Bun.file(GOLDEN).text()))
		answerWith({ ok: true, snapshot: DEMO, result })
		await session.commit(draft().plan, sheet)
		expect(sent[0]).not.toHaveProperty("preview")
		expect(sent[0]).toMatchObject({ kind: "record-values", against })
		expect(sent[0]?.["values"]).toHaveLength(4)
		expect(session.step).toBe("done")
		expect(session.saved?.counts).toEqual({ added: 2, unchanged: 1 })
	})

	test("while the Import runs, Cancel and Back do nothing, and the answer still lands on the done screen", async () => {
		session.toMatch(draft().parsed.sources, targets)
		session.choose("2:Old", "skip")
		let answer: (response: Response) => void = () => {}
		globalThis.fetch = (() =>
			new Promise<Response>((resolve) => {
				answer = resolve
			})) as unknown as typeof fetch
		const running = session.commit(draft().plan, sheet)
		expect(session.committing).toBe(true)
		session.cancel()
		session.back()
		expect([session.open, session.step]).toEqual([true, "match"])
		session.step = "review"
		session.cancel()
		session.back()
		expect([session.open, session.step]).toEqual([true, "review"])
		const result = accountValues.parse(JSON.parse(await Bun.file(GOLDEN).text()))
		answer(new Response(JSON.stringify({ ok: true, snapshot: DEMO, result })))
		await running
		expect([session.committing, session.step as string]).toEqual([false, "done"])
		session.cancel()
		expect([session.open, session.saved]).toEqual([false, null])
	})

	test("Back does nothing while the dry run is running", async () => {
		session.toMatch(draft().parsed.sources, targets)
		session.choose("2:Old", "skip")
		let answer: (response: Response) => void = () => {}
		globalThis.fetch = (() =>
			new Promise<Response>((resolve) => {
				answer = resolve
			})) as unknown as typeof fetch
		const running = session.toReview(draft().plan, sheet)
		expect(session.preview.state).toBe("running")
		session.back()
		expect(session.step).toBe("review")
		answer(
			new Response(JSON.stringify({ ok: false, error: { code: "x", exitCode: 1, message: "no" } })),
		)
		await running
	})

	test("Cancel discards the draft, the matches and the preview, and sends nothing", () => {
		session.toMatch(draft().parsed.sources, targets)
		session.cancel()
		expect(sent).toEqual([])
		expect([session.open, session.step, session.text, session.matches]).toEqual([
			false,
			"load",
			"",
			{},
		])
		expect(session.preview).toEqual({ state: "idle" })
	})

	test("a chosen file's text goes into the draft, where it can be fixed", async () => {
		const input = { files: [new File(["Date,Bank\n2026-01-31,1"], "history.csv")], value: "x" }
		await session.load(input as unknown as HTMLInputElement)
		expect([session.text, session.fileName, input.value]).toEqual([
			"Date,Bank\n2026-01-31,1",
			"history.csv",
			"",
		])
	})
})
