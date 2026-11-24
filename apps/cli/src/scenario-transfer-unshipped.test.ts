// A `transfer` Flow (sim ADR 0031): the engine takes it and the published shape does not describe it yet, so
// the CLI refuses it, with and without `--decimal`, until the shape does. It stores nothing.
import { describe, expect, it } from "bun:test"
import { sentenceFor } from "./projection/refusal-table"
import { toDecimalForm } from "./scenario/decimal"
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

type Doc = Record<string, unknown>

const MOVE = {
	id: "move",
	kind: "transfer",
	source: "cash",
	target: "loan",
	frequency: "once",
	start: "2026-06-01",
	amount: 1_000,
	growth: { bps: 0 },
}

function withTransfer(): Doc {
	return { ...SCENARIO_DOCUMENT, flows: [...SCENARIO_DOCUMENT.flows, MOVE] }
}

describe("scenario apply --file, with a transfer Flow, which ships in a later release", () => {
	it("refuses it at the Flow's kind, names the release, and stores nothing", async () => {
		const home = scenarioHome()
		const res = await applyScenario(home, "base", withTransfer())
		expect(res.code).toBe(2)
		const error = errorOf(res)
		expect(error).toMatchObject({ code: "invalid_input", path: "document.flows.2.kind" })
		expect(error.message).toContain("ships in a later release")
		expect(error.message).toContain('"transfer"')
		expect((error.details as { code: string }[]).map((entry) => entry.code)).toEqual([
			"ROUTING_NOT_SHIPPED",
		])
		expect(resultOf(await scenario(home, ["list"])).scenarios).toEqual([])
	})

	it("refuses it in the decimal form at the same path, and stores nothing", async () => {
		const home = scenarioHome()
		const decimal = toDecimalForm({ ...SCENARIO_DOCUMENT } as Doc)
		if ("body" in decimal) throw new Error("the decimal form of the plain document failed")
		const document = { ...decimal, flows: [...(decimal["flows"] as unknown[]), MOVE] }
		const res = await applyScenario(home, "base", document, ["--decimal"])
		expect(res.code).toBe(2)
		expect(errorOf(res)).toMatchObject({ path: "document.flows.2.kind" })
		expect(resultOf(await scenario(home, ["list"])).scenarios).toEqual([])
	})

	it("does not list `transfer` among the kinds an unknown kind may take", async () => {
		const bad = { ...SCENARIO_DOCUMENT, flows: [{ ...MOVE, kind: "payment" }] }
		const res = await applyScenario(scenarioHome(), "base", bad)
		const text = JSON.stringify(errorOf(res))
		expect(text).toContain("income, expense, contribution, withdrawal")
		expect(text).not.toContain("withdrawal, transfer")
	})

	it("still takes a plain document, byte for byte", async () => {
		const home = scenarioHome()
		const res = await applyScenario(home, "base", SCENARIO_DOCUMENT)
		expect(res.code).toBe(0)
		expect(rowOf(resultOf(res)).document).toEqual(SCENARIO_DOCUMENT as unknown as Doc)
	})
})

describe("scenario apply --add and --set, with a transfer Flow", () => {
	it.each([false, true])(
		"refuses --add flows=<transfer> with decimal %p, and changes nothing",
		async (decimal) => {
			const home = scenarioHome()
			await applyScenario(home, "base", SCENARIO_DOCUMENT)
			const before = await stored(home)
			const res = await apply(home, [
				"base",
				"--add",
				`flows=${JSON.stringify(MOVE)}`,
				...(decimal ? ["--decimal"] : []),
			])
			expect(res.code).toBe(2)
			expect(errorOf(res).message).toContain("ships in a later release")
			expect((await stored(home)).row).toEqual(before.row)
		},
	)

	it.each([false, true])(
		"refuses --set flows.salary.kind=transfer with decimal %p",
		async (decimal) => {
			const home = scenarioHome()
			await applyScenario(home, "base", SCENARIO_DOCUMENT)
			const before = await stored(home)
			const res = await apply(home, [
				"base",
				"--set",
				"flows.salary.kind=transfer",
				...(decimal ? ["--decimal"] : []),
			])
			expect(res.code).toBe(2)
			expect((await stored(home)).row).toEqual(before.row)
		},
	)
})

describe("the engine's transfer refusals are worded", () => {
	for (const code of [
		"TRANSFER_FROM_ILLIQUID",
		"TRANSFER_FROM_LIABILITY",
		"TRANSFER_SAME_ACCOUNT",
	] as const) {
		it(`${code} has a sentence and a way out`, () => {
			const said = sentenceFor({ code, path: ["scenario", "flows", "0", "source"] })
			expect(said?.message.endsWith(".")).toBe(true)
			expect(said?.hint).toBeDefined()
		})
	}
})
