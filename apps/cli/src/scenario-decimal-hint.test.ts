import { describe, expect, it } from "bun:test"
import {
	applyScenario,
	errorOf,
	resultOf,
	rowOf,
	scenario,
	scenarioHome,
} from "./scenario-test-support"
import { SCENARIO_DOCUMENT } from "./store/testing"

type Doc = Record<string, unknown>

/** The hint a minor-unit apply adds when a money field holds the decimal form (issue #227). */
const DECIMAL_HINT = "This looks like the decimal form: add --decimal."

/** The document's refusal still carries the schema hint every document refusal carries (ADR-0052). */
const SCHEMA_HINT = 'Run "traj schema scenario apply" to see the document schema.'

/** The stored plan's own document as `scenario show --decimal` prints it: a real decimal document. */
async function shownDecimal(home: string): Promise<Doc> {
	await applyScenario(home, "base", SCENARIO_DOCUMENT)
	return rowOf(resultOf(await scenario(home, ["show", "base", "--decimal"]))).document as Doc
}

/** A document with its first Flow's amount replaced: the one field these cases vary. */
function withFirstAmount(document: Doc, amount: unknown): Doc {
	const flows = document["flows"] as Doc[]
	return { ...document, flows: [{ ...flows[0], amount }, ...flows.slice(1)] }
}

/** The shared document with a capped surplus step, so `cashflow.surplus[].upTo.amount` is a money field. */
function cappedDocument(amount: unknown): Doc {
	return {
		...SCENARIO_DOCUMENT,
		accounts: [...SCENARIO_DOCUMENT.accounts, { id: "fund", kind: "asset", rate: 0 }],
		cashflow: {
			surplus: [{ account: "cash", upTo: { amount, growth: "inflation" } }, { account: "fund" }],
			contribute: [],
			withdraw: ["cash"],
		},
	}
}

describe("scenario apply of a decimal document without --decimal", () => {
	it("refuses on the money field, and its hint names --decimal before the schema hint", async () => {
		const home = scenarioHome()
		const document = await shownDecimal(home)
		const res = await applyScenario(home, "base", document)
		expect(res.code).toBe(2)
		expect(errorOf(res).code).toBe("invalid_input")
		expect(errorOf(res).path).toBe("document.flows.0.amount")
		const details = errorOf(res).details as { code?: string }[]
		expect(details[0]?.code).toBe("NOT_SAFE_INTEGER")
		expect(errorOf(res).message).toBe("document.flows.0.amount: NOT_SAFE_INTEGER")
		expect(errorOf(res).hint).toBe(`${DECIMAL_HINT} ${SCHEMA_HINT}`)
	})

	it("applies the same document unchanged when --decimal reads it", async () => {
		const home = scenarioHome()
		const document = await shownDecimal(home)
		const res = await applyScenario(home, "base", document, ["--decimal"])
		expect(res.code).toBe(0)
		expect(resultOf(res).status).toBe("unchanged")
	})

	const notDecimal: [string, unknown][] = [
		["a non-numeric string", "abc"],
		["a whole number without a dot, a minor-unit amount quoted by mistake", "9000"],
		["a leading dot", ".50"],
		["a JSON number", 9000.5],
	]
	for (const [label, amount] of notDecimal) {
		it(`carries no decimal hint for ${label}`, async () => {
			const home = scenarioHome()
			// The minor-unit document, so no other money field holds the decimal form.
			const document = withFirstAmount(SCENARIO_DOCUMENT as Doc, amount)
			const res = await applyScenario(home, "base", document)
			expect(errorOf(res).code).toBe("invalid_input")
			const details = errorOf(res).details as { code?: string }[]
			expect(details[0]?.code).toBe("NOT_SAFE_INTEGER")
			expect(errorOf(res).hint).toBe(SCHEMA_HINT)
		})
	}

	it("names --decimal even when a percent field is refused before the money fields", async () => {
		const home = scenarioHome()
		const shown = await shownDecimal(home)
		const accounts = shown["accounts"] as Doc[]
		// An Account's fee in the decimal form is a percent string, and Accounts are checked before Flows.
		const withFee = [
			{ ...accounts[0], fee: { bps: "1.50", rounding: "halfUp" } },
			...accounts.slice(1),
		]
		const res = await applyScenario(home, "base", { ...shown, accounts: withFee })
		expect(errorOf(res).code).toBe("invalid_input")
		expect(errorOf(res).path).toBe("document.accounts.0.fee.bps")
		expect(errorOf(res).hint).toBe(`${DECIMAL_HINT} ${SCHEMA_HINT}`)
	})

	it("carries no decimal hint on a field --decimal does not convert, such as inflation", async () => {
		const home = scenarioHome()
		const document = { ...SCENARIO_DOCUMENT, economy: { inflation: "3.00" } }
		const res = await applyScenario(home, "base", document)
		expect(errorOf(res).code).toBe("invalid_input")
		expect(errorOf(res).path).toBe("document.economy.inflation")
		const details = errorOf(res).details as { code?: string }[]
		expect(details[0]?.code).toBe("NOT_SAFE_INTEGER")
		expect(errorOf(res).hint).toBe(SCHEMA_HINT)
	})

	it("names --decimal on a deeper money path, cashflow.surplus[].upTo.amount", async () => {
		const res = await applyScenario(scenarioHome(), "base", cappedDocument("9000.500"))
		expect(errorOf(res).code).toBe("invalid_input")
		expect(errorOf(res).path).toBe("document.cashflow.surplus.0.upTo.amount")
		const details = errorOf(res).details as { code?: string }[]
		expect(details[0]?.code).toBe("NOT_SAFE_INTEGER")
		expect(errorOf(res).hint).toBe(`${DECIMAL_HINT} ${SCHEMA_HINT}`)
	})

	it("names --decimal for -0.50 and 9000.500, and none for 1.005, which --decimal refuses", async () => {
		for (const amount of ["-0.50", "9000.500"]) {
			const res = await applyScenario(
				scenarioHome(),
				"base",
				withFirstAmount(SCENARIO_DOCUMENT as Doc, amount),
			)
			expect(errorOf(res).hint).toBe(`${DECIMAL_HINT} ${SCHEMA_HINT}`)
		}
		const refused = await applyScenario(
			scenarioHome(),
			"base",
			withFirstAmount(SCENARIO_DOCUMENT as Doc, "1.005"),
		)
		const details = errorOf(refused).details as { code?: string }[]
		expect(details[0]?.code).toBe("NOT_SAFE_INTEGER")
		expect(errorOf(refused).hint).toBe(SCHEMA_HINT)
	})

	it("carries no decimal hint in a currency --decimal does not read", async () => {
		const document = { ...withFirstAmount(SCENARIO_DOCUMENT as Doc, "9000.50"), currency: "USD" }
		const res = await applyScenario(scenarioHome(), "base", document)
		expect(errorOf(res).code).toBe("invalid_input")
		expect(errorOf(res).hint).not.toContain(DECIMAL_HINT)
	})
})
