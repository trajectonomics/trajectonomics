import { describe, expect, test } from "bun:test"
import { whatIfSession } from "../../client/what-if.svelte.js"
import { fakeServer, HASH, useSessionHooks } from "../../client/what-if.test-support"
import { type ScenarioDocument, scenarioDocument } from "../../lib/contract"
import { documentFromDraft } from "../../lib/view/assumptions/build"
import { draftOf } from "../../lib/view/assumptions/draft"
import { recordOf } from "../../lib/what-if/session"
import { tryValues } from "./try-values"

useSessionHooks()

const doc = (over: Record<string, unknown> = {}): ScenarioDocument =>
	scenarioDocument.parse({
		currency: "THB",
		flows: [],
		accounts: [{ id: "fund", kind: "asset", rate: 500, volatility: 1500 }],
		economy: { inflation: 300 },
		...over,
	})

/** What the form makes of the stored plan after the person changes some text: the page's own steps, then the try. */
function tryText(
	stored: ScenarioDocument,
	change: (row: ReturnType<typeof draftOf>) => void,
): void {
	const draft = draftOf(stored)
	change(draft)
	const result = documentFromDraft(stored, draft)
	if (!result.ok) throw new Error(JSON.stringify(result.problems))
	tryValues("base", HASH, stored, result.document)
}

const paths = () => whatIfSession.whatIf?.sets.map((set) => [set.path, set.value])

describe("trying the assumptions as a what-if", () => {
	test("a lower volatility is a Set of that field, a first one the Account whole, and nothing is written", () => {
		fakeServer()
		tryText(doc(), (draft) => {
			const row = draft.accounts[0]
			if (row) row.volatility = "5"
		})
		expect(paths()).toEqual([["accounts.fund.volatility", 500]])
		whatIfSession.end()
		const none = doc({ accounts: [{ id: "fund", kind: "asset", rate: 500 }] })
		tryText(none, (draft) => {
			const row = draft.accounts[0]
			if (row) row.volatility = "8"
		})
		expect(whatIfSession.whatIf?.sets.map((set) => set.path)).toEqual(["accounts.fund"])
	})

	test("a changed inflation is the Set economy.inflation", () => {
		fakeServer()
		tryText(doc(), (draft) => {
			draft.inflation = "5"
		})
		expect(paths()).toEqual([["economy.inflation", 500]])
	})

	test("a return tried, then the form made again from the stored plan and a swing tried: both are in the session", () => {
		fakeServer()
		const stored = doc()
		tryText(stored, (draft) => {
			const row = draft.accounts[0]
			if (row) row.rate = "4"
		})
		// The page is left and opened again: its draft starts from the stored plan, not from the try.
		tryText(stored, (draft) => {
			const row = draft.accounts[0]
			if (row) row.volatility = "8"
		})
		expect(paths()).toEqual([
			["accounts.fund.rate", 400],
			["accounts.fund.volatility", 800],
		])
	})

	test("a return tried on the Account form, then a swing tried here: both are kept", () => {
		fakeServer()
		const stored = doc()
		const fund = stored.accounts[0]
		if (fund === undefined) throw new Error("no fund")
		whatIfSession.tryAccount("base", HASH, {
			stored: recordOf(fund),
			edited: { ...recordOf(fund), id: "fund", rate: 700 },
		})
		tryText(stored, (draft) => {
			const row = draft.accounts[0]
			if (row) row.volatility = "8"
		})
		expect(paths()).toEqual([
			["accounts.fund.rate", 700],
			["accounts.fund.volatility", 800],
		])
	})
})
