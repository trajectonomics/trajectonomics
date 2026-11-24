import { describe, expect, it } from "bun:test"
import { sentenceFor } from "./projection/refusal-table"
import { ROUTING_PLAN } from "./projection-routing-plan"
import {
	applyScenario,
	errorOf,
	resultOf,
	rowOf,
	scenario,
	scenarioHome,
} from "./scenario-test-support"
import { apply } from "./scenario-what-if-support"

/* A `transfer` Flow in a document (cli ADR-0070, sim ADR 0031): the kind is published, `--add` and `--set` reach it in both forms, and the engine's refusals of it are worded. */

type Doc = Record<string, unknown>

const documentOf = (res: Awaited<ReturnType<typeof scenario>>): Doc => rowOf(resultOf(res)).document

describe("a transfer Flow in a document", () => {
	const MOVE = {
		id: "move",
		kind: "transfer",
		source: "cash",
		target: "funds",
		frequency: "monthly",
		start: "2026-02-01",
		amount: 100_000,
		growth: { bps: 0 },
	}
	const flowsOf = (document: Doc) => document["flows"] as Doc[]

	it("lists transfer among the kinds an unknown kind may take", async () => {
		const bad = { ...ROUTING_PLAN, flows: [{ ...MOVE, kind: "payment" }] }
		const text = JSON.stringify(errorOf(await applyScenario(scenarioHome(), "plan", bad)))
		expect(text).toContain("income, expense, contribution, withdrawal, transfer")
	})

	it.each([false, true])("takes --add flows=<transfer> with decimal %p", async (decimal) => {
		const home = scenarioHome()
		await applyScenario(home, "plan", ROUTING_PLAN)
		const item = decimal ? { ...MOVE, amount: "1000.00" } : MOVE
		const res = await apply(home, [
			"plan",
			"--add",
			`flows=${JSON.stringify(item)}`,
			...(decimal ? ["--decimal"] : []),
		])
		expect(res.code).toBe(0)
		expect(flowsOf(documentOf(await scenario(home, ["show", "plan"]))).at(-1)).toEqual(MOVE)
	})

	it.each([false, true])("reaches a transfer's amount with --set, decimal %p", async (decimal) => {
		const home = scenarioHome()
		await applyScenario(home, "plan", ROUTING_PLAN)
		const res = await apply(home, [
			"plan",
			"--set",
			`flows.pay-debt.amount=${decimal ? '"2500.00"' : "250000"}`,
			...(decimal ? ["--decimal"] : []),
		])
		expect(res.code).toBe(0)
		const flow = flowsOf(documentOf(await scenario(home, ["show", "plan"]))).find(
			(entry) => entry["id"] === "pay-debt",
		)
		expect(flow?.["amount"]).toBe(250_000)
	})

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

	it("states a transfer out of a liability in words, at the source", async () => {
		const bad = { ...ROUTING_PLAN, flows: [{ ...MOVE, source: "debt", target: "cash" }] }
		const res = await applyScenario(scenarioHome(), "plan", bad)
		expect(res.code).toBe(2)
		expect(errorOf(res).path).toBe("document.flows.0.source")
		expect(errorOf(res).message).not.toBe("document.flows.0.source: TRANSFER_FROM_LIABILITY")
	})
})
