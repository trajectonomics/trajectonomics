// The routing keys the engine accepts and the CLI does not take yet (sim ADR 0030): a surplus step's
// `share`, a `withdraw` entry that is an object, and an `upTo` that is `{ amount, growth }`. The
// published shape does not describe them, so the CLI refuses each, with and without `--decimal`,
// until the shape does.
import { describe, expect, it } from "bun:test"
import { toDecimalForm } from "./scenario/decimal"
import { CASES, type Doc, GROWN, withCashflow } from "./scenario-routing-support"
import {
	applyScenario,
	errorOf,
	resultOf,
	rowOf,
	scenario,
	scenarioHome,
} from "./scenario-test-support"
import { apply, stored } from "./scenario-what-if-support"
import { SCENARIO_DOCUMENT } from "./store/testing"

describe("scenario apply --file, with a routing key that ships in a later release", () => {
	for (const { name, cashflow, path, said } of CASES) {
		it(`refuses ${name} at ${path}, and stores nothing`, async () => {
			const home = scenarioHome()
			const res = await applyScenario(home, "base", withCashflow(cashflow))
			expect(res.code).toBe(2)
			const error = errorOf(res)
			expect(error).toMatchObject({ code: "invalid_input", path: `document.${path}` })
			expect(error.message).toContain("ships in a later release")
			expect(error.message).toContain(said)
			expect(resultOf(await scenario(home, ["list"])).scenarios).toEqual([])
		})

		it(`refuses ${name} in the decimal form at the same path, and stores nothing`, async () => {
			const home = scenarioHome()
			const decimal = toDecimalForm({ ...SCENARIO_DOCUMENT } as Doc)
			if ("body" in decimal) throw new Error("the decimal form of the plain document failed")
			const document = { ...decimal, ...withCashflow(cashflow), flows: decimal["flows"] }
			const res = await applyScenario(home, "base", document, ["--decimal"])
			expect(res.code).toBe(2)
			const error = errorOf(res)
			expect(error).toMatchObject({ code: "invalid_input", path: `document.${path}` })
			expect(error.message).toContain("ships in a later release")
			expect(resultOf(await scenario(home, ["list"])).scenarios).toEqual([])
		})
	}

	it("lists every refused key in details, in document order", async () => {
		const res = await applyScenario(
			scenarioHome(),
			"base",
			withCashflow({
				surplus: [{ account: "cash", share: 1000, upTo: GROWN }, { account: "funds" }],
				contribute: [],
				withdraw: [{ account: "cash", downTo: 1 }],
			}),
		)
		const details = errorOf(res).details as { path: string; code: string }[]
		expect(details.map((entry) => entry.path)).toEqual([
			"document.cashflow.surplus.0.share",
			"document.cashflow.surplus.0.upTo",
			"document.cashflow.withdraw.0",
		])
		expect(details.every((entry) => entry.code === "ROUTING_NOT_SHIPPED")).toBe(true)
	})

	it("states the unshipped key first when the engine refuses the same document for it", async () => {
		const res = await applyScenario(
			scenarioHome(),
			"base",
			withCashflow({
				surplus: [{ account: "cash", share: 1000 }],
				contribute: [],
				withdraw: ["cash"],
			}),
		)
		const error = errorOf(res)
		expect(error.path).toBe("document.cashflow.surplus.0.share")
		expect(error.message).toContain("ships in a later release")
		expect((error.details as { code: string }[]).map((entry) => entry.code)).toEqual([
			"ROUTING_NOT_SHIPPED",
			"SURPLUS_SHARE_LAST",
		])
	})

	it("still takes a plain document, byte for byte", async () => {
		const home = scenarioHome()
		const res = await applyScenario(home, "base", SCENARIO_DOCUMENT)
		expect(res.code).toBe(0)
		expect(rowOf(resultOf(res)).document).toEqual(SCENARIO_DOCUMENT as unknown as Doc)
	})
})

describe("scenario apply --set and fork --set, with a routing key that ships in a later release", () => {
	const SETS: readonly { name: string; set: string }[] = [
		{
			name: "a share",
			set: `cashflow.surplus=${JSON.stringify([{ account: "cash", share: 3000 }, { account: "funds" }])}`,
		},
		{
			name: "a floored entry",
			set: `cashflow.withdraw=${JSON.stringify([{ account: "cash", downTo: 3000 }])}`,
		},
		{
			name: "an object upTo",
			set: `cashflow.surplus=${JSON.stringify([{ account: "cash", upTo: GROWN }, { account: "funds" }])}`,
		},
	]

	for (const { name, set } of SETS) {
		for (const decimal of [false, true]) {
			it(`refuses ${name} with --set${decimal ? " --decimal" : ""}, and changes nothing`, async () => {
				const home = scenarioHome()
				await applyScenario(home, "base", withCashflow(plainCashflow()))
				const before = await stored(home)
				const res = await apply(home, ["base", "--set", set, ...(decimal ? ["--decimal"] : [])])
				expect(res.code).toBe(2)
				const error = errorOf(res)
				expect(error.code).toBe("invalid_input")
				expect(error.path).toBe("--set")
				expect(error.message).toContain("ships in a later release")
				expect((await stored(home)).row).toEqual(before.row)
			})
		}
	}

	it("refuses the same on scenario fork --set, with and without --decimal", async () => {
		const home = scenarioHome()
		await applyScenario(home, "base", withCashflow(plainCashflow()))
		for (const extra of [[], ["--decimal"]]) {
			const res = await scenario(home, [
				"fork",
				"base",
				"later",
				"--set",
				`cashflow.surplus=${JSON.stringify([{ account: "cash", share: 3000 }, { account: "funds" }])}`,
				...extra,
			])
			expect(res.code).toBe(2)
			expect(errorOf(res).message).toContain("ships in a later release")
		}
		expect(resultOf(await scenario(home, ["list"])).scenarios).toHaveLength(1)
	})
})

function plainCashflow(): Doc {
	return {
		surplus: [{ account: "cash", upTo: 500_000 }, { account: "funds" }],
		contribute: [],
		withdraw: ["cash", "funds"],
	}
}
