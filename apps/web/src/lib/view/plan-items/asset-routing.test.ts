import { describe, expect, test } from "bun:test"
import type { ErrorBody, ScenarioDocument } from "../../contract"
import { planWithHome } from "./asset-fixtures.test-support"
import { ownedChoicesOf, ownedUnavailable, routedChoicesOf } from "./asset-owned"
import { assetLayoutOf, assetShown } from "./asset-refusal"
import { baselineRead, planDocument } from "./fixtures.test-support"

const doc = planWithHome()

/** The plan fixture with no routing list naming an Account. */
function unrouted(): ScenarioDocument {
	return { ...planDocument(), cashflow: { surplus: [], contribute: [], withdraw: [] } }
}

describe("an asset a routing list names cannot be a real asset", () => {
	test("it is left out of the choices, and the form says why when none is left", () => {
		const base = planDocument()
		expect(ownedChoicesOf(base, baselineRead())).toEqual([])
		expect(routedChoicesOf(base, baselineRead())).toEqual(["Bank"])
		const why = ownedUnavailable([], routedChoicesOf(base, baselineRead()))
		expect(why).toContain("Bank")
		expect(why).toContain("pays for shortfalls in this plan")
		expect(ownedUnavailable([], [])).toContain("holds no asset")
	})

	test("each of withdraw, surplus and contribute keeps it out", () => {
		for (const cashflow of [
			{ withdraw: ["bank"] },
			{ surplus: [{ account: "bank" }] },
			{ contribute: ["bank"] },
		]) {
			const base = { ...planDocument(), cashflow }
			expect(ownedChoicesOf(base, baselineRead())).toEqual([])
		}
		expect(ownedChoicesOf(unrouted(), baselineRead()).map((choice) => choice.id)).toEqual(["bank"])
	})
})

describe("a refusal the form can cause is said in plain words", () => {
	const refusal = (code: string, path: string): ErrorBody =>
		({
			code: "invalid_input",
			message: `${path}: ${code}`,
			path,
			exitCode: 2,
			details: [{ path, code, message: `${path}: ${code}` }],
		}) as unknown as ErrorBody
	const layout = assetLayoutOf(doc, "home", false, ["running.rate"])
	const index = doc.flows.findIndex((flow) => flow.id === "home-rent")

	test("a Milestone reading the next 12 months of expenses lands on the percent of value", () => {
		const error = refusal(
			"NEXT_12_MONTHS_READS_ACCOUNT",
			"document.milestones.0.criterion.metric.expenses",
		)
		const shown = assetShown({}, error, error.message, layout)
		expect(shown.at("running.rate")).toContain("next 12 months of expenses")
		expect(shown.general).toBeUndefined()
	})

	test("a sale before the first loan payment, or the costs, lands on Sold on", () => {
		const error = refusal("END_BEFORE_START", `document.flows.${index}.end`)
		const shown = assetShown({}, error, error.message, layout)
		expect(shown.at("saleDate")).toContain("Sold on")
		expect(shown.at("saleDate")).not.toContain("END_BEFORE_START")
	})

	test("an asset a routing list names says so at its choice, or for the form", () => {
		const error = refusal("ILLIQUID_ROUTED", "document.cashflow.withdraw.0")
		const owned = assetShown({}, error, error.message, assetLayoutOf(doc, "bank", true))
		expect(owned.at("ownedAccount")).toContain("cash-flow routing")
		expect(assetShown({}, error, error.message, layout).general).toContain("cash-flow routing")
		const draws = refusal("OBLIGATION_TARGET_WITHDRAWN", "document.flows.0.target")
		expect(assetShown({}, draws, draws.message, layout).at("name")).toContain("purchase")
	})
})
