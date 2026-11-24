import { describe, expect, test } from "bun:test"
import { whatIfSession } from "../../client/what-if.svelte.js"
import { fakeServer, HASH, useSessionHooks } from "../../client/what-if.test-support"
import { type ScenarioDocument, scenarioDocument } from "../../lib/contract"
import { tryValues } from "./try-values"

useSessionHooks()

const doc = (over: Record<string, unknown> = {}): ScenarioDocument =>
	scenarioDocument.parse({
		currency: "THB",
		flows: [],
		accounts: [{ id: "fund", kind: "asset", rate: 500, volatility: 1500 }],
		...over,
	})

describe("trying the assumptions as a what-if", () => {
	test("a lower volatility is a Set of that field, a first one the Account whole, and nothing is written", () => {
		fakeServer()
		const stored = doc()
		const lower = doc({ accounts: [{ id: "fund", kind: "asset", rate: 500, volatility: 500 }] })
		expect(tryValues("base", HASH, stored, lower)).toEqual({ cleared: [], inflationUntried: false })
		expect(whatIfSession.whatIf?.sets).toEqual([{ path: "accounts.fund.volatility", value: 500 }])
		const none = doc({ accounts: [{ id: "fund", kind: "asset", rate: 500 }] })
		const first = doc({ accounts: [{ id: "fund", kind: "asset", rate: 500, volatility: 800 }] })
		tryValues("base", HASH, none, first)
		expect(whatIfSession.whatIf?.sets.map((set) => set.path)).toEqual(["accounts.fund"])
	})

	test("an inflation the plan holds is a Set; one it does not state is said, not tried; taking it out is cleared", () => {
		fakeServer()
		const held = doc({ economy: { inflation: 300 } })
		expect(
			tryValues("base", HASH, held, doc({ economy: { inflation: 500 } })).inflationUntried,
		).toBe(false)
		expect(whatIfSession.whatIf?.sets).toEqual([{ path: "economy.inflation", value: 500 }])
		expect(tryValues("base", HASH, held, doc()).cleared).toEqual(["inflation"])
		expect(
			tryValues("base", HASH, doc(), doc({ economy: { inflation: 500 } })).inflationUntried,
		).toBe(true)
	})
})
