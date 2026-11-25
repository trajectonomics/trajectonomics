import { describe, expect, it } from "bun:test"
import { toDecimalForm } from "./scenario/decimal"
import { acceptedScenarioSchemaVersion } from "./scenario/document"
import { scenarioExample } from "./scenario/shape/example"
import {
	applyScenario,
	errorOf,
	resultOf,
	rowOf,
	scenario,
	scenarioHome,
} from "./scenario-test-support"
import { SCENARIO_DOCUMENT } from "./store/testing"
import { capture } from "./test-support"

type Doc = Record<string, unknown>

/** The Scenario's own document as `scenario show` prints it, in minor units or decimal form. */
async function shown(home: string, decimal: boolean): Promise<Doc> {
	const args = decimal ? ["show", "base", "--decimal"] : ["show", "base"]
	return rowOf(resultOf(await scenario(home, args))).document as Doc
}

/** The decimal form of a minor-unit document, as `show --decimal` would print it. */
function decimalOf(document: unknown): Doc {
	const converted = toDecimalForm(document as Doc)
	if ("body" in converted) throw new Error("the document is not in the decimal form's domain")
	return converted
}

/** The id of the fixture's first Flow, the one a document path names in these cases. */
function firstFlowId(): unknown {
	const flows: readonly Doc[] = SCENARIO_DOCUMENT["flows"]
	return flows[0]?.["id"]
}

/** The first Flow with its amount swapped for `amount`: the one field these cases vary. */
function withFirstAmount(document: object, amount: unknown): Doc {
	const doc = document as Doc
	const flows = doc["flows"] as Doc[]
	return { ...doc, flows: [{ ...flows[0], amount }, ...flows.slice(1)] }
}

describe("scenario show --decimal", () => {
	it("prints money as decimal strings and every rate as an integer", async () => {
		const home = scenarioHome()
		await applyScenario(home, "base", SCENARIO_DOCUMENT)
		const decimal = await shown(home, true)
		const minor = await shown(home, false)
		expect(decimal).toEqual(decimalOf(minor))
		const amount = (decimal["flows"] as Doc[])[0]?.["amount"]
		expect(amount).toMatch(/^-?\d+\.\d{2}$/)
		expect(decimal["accounts"]).toEqual(minor["accounts"])
	})

	it("refuses a Scenario whose currency is not THB, at its document path", async () => {
		const home = scenarioHome()
		await applyScenario(home, "base", { ...SCENARIO_DOCUMENT, currency: "USD" })
		const res = await scenario(home, ["show", "base", "--decimal"])
		expect(res.code).toBe(3)
		expect(errorOf(res).code).toBe("unsupported_currency")
		expect(errorOf(res).path).toBe("document.currency")
	})
})

describe("scenario apply --decimal", () => {
	it("leaves a stored plan byte-identical when it saves what show --decimal printed", async () => {
		const home = scenarioHome()
		await applyScenario(home, "base", SCENARIO_DOCUMENT)
		const before = rowOf(resultOf(await scenario(home, ["show", "base"])))
		const printed = await shown(home, true)
		const res = await applyScenario(home, "base", printed, ["--decimal"])
		expect(res.code).toBe(0)
		const applied = resultOf(res)
		expect(applied.status).toBe("unchanged")
		const after = rowOf(resultOf(await scenario(home, ["show", "base"])))
		expect(after.contentHash).toBe(before.contentHash)
		expect(JSON.stringify(after.document)).toBe(JSON.stringify(before.document))
	})

	it("stores a decimal amount as its minor units, and prints the row in decimal form", async () => {
		const home = scenarioHome()
		await applyScenario(home, "base", SCENARIO_DOCUMENT)
		const document = withFirstAmount(decimalOf(SCENARIO_DOCUMENT), "9000.50")
		const res = await applyScenario(home, "base", document, ["--decimal"])
		expect(res.code).toBe(0)
		expect(resultOf(res).status).toBe("updated")
		expect(rowOf(resultOf(res)).document).toEqual(document)
		const stored = (await shown(home, false))["flows"] as Doc[]
		expect(stored[0]?.["amount"]).toBe(900_050)
	})

	it("reports a dry run with --decimal and leaves the stored plan alone", async () => {
		const home = scenarioHome()
		await applyScenario(home, "base", SCENARIO_DOCUMENT)
		const before = await shown(home, false)
		const document = withFirstAmount(decimalOf(SCENARIO_DOCUMENT), "9000.50")
		const res = await applyScenario(home, "base", document, ["--decimal", "--dry-run"])
		expect(res.code).toBe(0)
		expect(resultOf(res).dryRun).toBe(true)
		expect(resultOf(res).status).toBe("updated")
		expect(await shown(home, false)).toEqual(before)
	})

	it("round-trips the template: its money applies unchanged in decimal form", async () => {
		const home = scenarioHome()
		const text = resultOf(await scenario(home, ["apply", "--template"]))
		expect(typeof text).toBe("string")
		const minor = JSON.parse(text as string) as Doc
		const res = await applyScenario(home, "base", decimalOf(minor), ["--decimal"])
		expect(res.code).toBe(0)
		expect(resultOf(res).status).toBe("created")
		expect(await shown(home, false)).toEqual(minor)
	})

	it("round-trips the shape's worked example and the fixture", async () => {
		const version = acceptedScenarioSchemaVersion()
		if (version === undefined) throw new Error("the pinned sim-core accepts no version")
		for (const minor of [scenarioExample(version), SCENARIO_DOCUMENT]) {
			const home = scenarioHome()
			await applyScenario(home, "base", minor)
			const first = rowOf(resultOf(await scenario(home, ["show", "base"])))
			const res = await applyScenario(home, "base", await shown(home, true), ["--decimal"])
			expect(res.code).toBe(0)
			expect(resultOf(res).status).toBe("unchanged")
			expect(rowOf(resultOf(res)).contentHash).toBe(first.contentHash)
		}
	})

	it("refuses a JSON number in a money field, at its document path, with a hint", async () => {
		const home = scenarioHome()
		const id = firstFlowId()
		const res = await applyScenario(home, "base", withFirstAmount(SCENARIO_DOCUMENT, 900_050), [
			"--decimal",
		])
		expect(res.code).toBe(2)
		expect(errorOf(res).code).toBe("invalid_input")
		expect(errorOf(res).path).toBe(`document.flows.${id}.amount`)
		expect(errorOf(res).hint).toBe(
			'Write it as a decimal string such as "350.00", or drop --decimal to give minor units',
		)
	})

	const refusals: [string, unknown, number, string, string][] = [
		["a grouped string", "9,000.50", 2, "invalid_input", "amount"],
		["more places than THB has", "1.005", 3, "INVALID_AMOUNT", "amount"],
		["a non-numeric string", "nine", 2, "invalid_input", "amount"],
	]
	for (const [label, amount, exit, code, field] of refusals) {
		it(`refuses ${label} as ${code} at the amount's document path`, async () => {
			const home = scenarioHome()
			const id = firstFlowId()
			const document = withFirstAmount(decimalOf(SCENARIO_DOCUMENT), amount)
			const res = await applyScenario(home, "base", document, ["--decimal"])
			expect(res.code).toBe(exit)
			expect(errorOf(res).code).toBe(code)
			expect(errorOf(res).path).toBe(`document.flows.${id}.${field}`)
		})
	}

	it("refuses a negative amount with the core's own code, not a conversion error", async () => {
		const home = scenarioHome()
		const document = withFirstAmount(decimalOf(SCENARIO_DOCUMENT), "-5.00")
		const res = await applyScenario(home, "base", document, ["--decimal"])
		expect(res.code).toBe(2)
		expect(errorOf(res).code).toBe("invalid_input")
		const details = errorOf(res).details as { code: string }[]
		expect(details[0]?.code).toBe("NEGATIVE_AMOUNT")
	})

	it("refuses a missing or unsupported currency before any field, as unsupported_currency", async () => {
		const home = scenarioHome()
		const { currency: _currency, ...noCurrency } = decimalOf(SCENARIO_DOCUMENT)
		const missing = await applyScenario(home, "base", noCurrency, ["--decimal"])
		expect(missing.code).toBe(3)
		expect(errorOf(missing).code).toBe("unsupported_currency")
		const usd = await applyScenario(
			home,
			"base",
			{ ...decimalOf(SCENARIO_DOCUMENT), currency: "USD" },
			["--decimal"],
		)
		expect(usd.code).toBe(3)
		expect(errorOf(usd).path).toBe("document.currency")
	})

	it("refuses a minor-unit document given with --decimal, since its amounts are numbers", async () => {
		const home = scenarioHome()
		const res = await applyScenario(home, "base", SCENARIO_DOCUMENT, ["--decimal"])
		expect(res.code).toBe(2)
		expect(errorOf(res).code).toBe("invalid_input")
	})

	it("refuses --template beside --decimal, and names the form that takes it", async () => {
		const home = scenarioHome()
		const res = await capture(["scenario", "apply", "--template", "--decimal", "--json"], {
			TRAJ_HOME: home,
		})
		expect(res.code).toBe(2)
		// The refusal names the flag as the caller typed it (ADR-0013).
		expect(errorOf(res).path).toBe("--decimal")
		expect(errorOf(res).hint).toContain("--file <path> --decimal")
	})
})
