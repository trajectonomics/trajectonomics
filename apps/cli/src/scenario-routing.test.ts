import { describe, expect, it } from "bun:test"
import { ROUTING_PLAN } from "./projection-routing-plan"
import {
	applyScenario,
	errorOf,
	resultOf,
	rowOf,
	scenario,
	scenarioHome,
} from "./scenario-test-support"
import { capture } from "./test-support"

/*
 * The routing forms and the transfer Flow in a document (cli ADR-0070): `scenario apply` stores them in both forms,
 * the decimal form round-trips byte for byte, `scenario fork --set` reaches a step and an entry, and `traj schema`
 * describes each. The forms are the engine's: the CLI states no refusal of them of its own.
 */

type Doc = Record<string, unknown>

const documentOf = (res: Awaited<ReturnType<typeof scenario>>): Doc => rowOf(resultOf(res)).document

describe("scenario apply, with a share, a floor, a target that keeps its value and a transfer", () => {
	it("stores them as written, and shows them", async () => {
		const home = scenarioHome()
		const res = await applyScenario(home, "plan", ROUTING_PLAN)
		expect(res.code).toBe(0)
		const shown = documentOf(await scenario(home, ["show", "plan"]))
		expect(shown["cashflow"]).toEqual(ROUTING_PLAN.cashflow as unknown as Doc)
		expect((shown["flows"] as Doc[]).map((flow) => flow["kind"])).toContain("transfer")
	})

	it("no longer says the keys ship in a later release", async () => {
		const res = await applyScenario(scenarioHome(), "plan", ROUTING_PLAN)
		expect(res.err).toBe("")
		expect(res.out).not.toContain("later release")
	})

	it("round-trips the decimal form byte for byte: show --decimal, apply --decimal, the same hash", async () => {
		const home = scenarioHome()
		const first = rowOf(resultOf(await applyScenario(home, "plan", ROUTING_PLAN)))
		const decimal = documentOf(await scenario(home, ["show", "plan", "--decimal"]))
		const cashflow = decimal["cashflow"] as { surplus: Doc[]; withdraw: unknown[] }
		expect(cashflow.surplus[0]?.["upTo"]).toEqual({ amount: "100000.00", growth: "inflation" })
		expect(cashflow.surplus[1]).toEqual({ account: "funds", share: "50.00" })
		expect(cashflow.withdraw[0]).toEqual({
			account: "emergency",
			downTo: { amount: "20000.00", growth: "inflation" },
		})
		const other = scenarioHome()
		const second = rowOf(resultOf(await applyScenario(other, "plan", decimal, ["--decimal"])))
		expect(second.contentHash).toBe(first.contentHash)
		// What is stored is the minor-unit document, the one the first apply stored.
		expect(documentOf(await scenario(other, ["show", "plan"]))).toEqual(first.document)
	})

	it("reads a nominal target and a grown one in decimal, and refuses a JSON number where one is a string", async () => {
		const home = scenarioHome()
		await applyScenario(home, "plan", ROUTING_PLAN)
		const decimal = documentOf(await scenario(home, ["show", "plan", "--decimal"]))
		const withNumber = {
			...decimal,
			cashflow: {
				...(decimal["cashflow"] as Doc),
				surplus: [{ account: "emergency", upTo: 5_000_000 }, { account: "cash" }],
			},
		}
		const res = await applyScenario(scenarioHome(), "plan", withNumber, ["--decimal"])
		expect(res.code).toBe(2)
		expect(errorOf(res).path).toBe("document.cashflow.surplus.0.upTo")
		expect(errorOf(res).message).toContain("JSON number")
	})

	it("states a share on the last step in words, at the share", async () => {
		const bad = {
			...ROUTING_PLAN,
			cashflow: {
				surplus: [{ account: "emergency" }, { account: "cash", share: 1000 }],
				contribute: [],
				withdraw: [],
			},
		}
		const res = await applyScenario(scenarioHome(), "plan", bad)
		expect(res.code).toBe(2)
		expect(errorOf(res).path).toBe("document.cashflow.surplus.1.share")
		expect(errorOf(res).message).toContain("the last step must take everything that is left")
	})
})

describe("scenario fork --set, by position", () => {
	it("persists a floor begun on a bare entry, and the fork shows it in both forms", async () => {
		const home = scenarioHome()
		await applyScenario(home, "plan", ROUTING_PLAN)
		const res = await scenario(home, [
			"fork",
			"plan",
			"kept",
			"--set",
			"cashflow.withdraw.1.downTo=24000000",
		])
		expect(res.code).toBe(0)
		const shown = documentOf(await scenario(home, ["show", "kept"]))
		expect((shown["cashflow"] as { withdraw: unknown[] }).withdraw[1]).toEqual({
			account: "funds",
			downTo: 24_000_000,
		})
		const decimal = documentOf(await scenario(home, ["show", "kept", "--decimal"]))
		expect((decimal["cashflow"] as { withdraw: unknown[] }).withdraw[1]).toEqual({
			account: "funds",
			downTo: "240000.00",
		})
		// The plan it was forked from is untouched.
		expect(
			(documentOf(await scenario(home, ["show", "plan"]))["cashflow"] as { withdraw: unknown[] })
				.withdraw[1],
		).toBe("funds")
	})

	it("reads a decimal value for a target in a fork", async () => {
		const home = scenarioHome()
		await applyScenario(home, "plan", ROUTING_PLAN)
		const res = await scenario(home, [
			"fork",
			"plan",
			"kept",
			"--decimal",
			"--set",
			'cashflow.surplus.0.upTo={"amount":"80000.00","growth":{"bps":100}}',
		])
		expect(res.code).toBe(0)
		const shown = documentOf(await scenario(home, ["show", "kept"]))
		expect((shown["cashflow"] as { surplus: Doc[] }).surplus[0]?.["upTo"]).toEqual({
			amount: 8_000_000,
			growth: { bps: 100 },
		})
	})
})

describe("traj schema scenario apply", () => {
	type Node = Record<string, unknown>
	const schemaOf = async () => {
		const res = await capture(["schema", "scenario", "apply", "--json"], {
			TRAJ_HOME: scenarioHome(),
		})
		expect(res.code).toBe(0)
		return JSON.parse(res.out) as {
			document: {
				schema: { properties: Record<string, Node> }
				alternate: { schema: { properties: Record<string, Node> } }
			}
		}
	}

	it("lists the transfer kind and describes its keys", async () => {
		const flows = (await schemaOf()).document.schema.properties["flows"] as {
			items: { properties: Record<string, Node> }
		}
		expect((flows.items.properties["kind"] as { enum: string[] }).enum).toContain("transfer")
		expect(flows.items.properties["realise"]).toMatchObject({ type: "boolean" })
		expect(String(flows.items.properties["source"]?.["description"])).toContain("transfer")
	})

	it("describes a share, a floor and a target that keeps its value, in the minor-unit form", async () => {
		const cashflow = (await schemaOf()).document.schema.properties["cashflow"] as {
			properties: {
				surplus: { items: { properties: Record<string, Node> } }
				withdraw: { items: Node }
			}
		}
		const step = cashflow.properties.surplus.items.properties
		expect(step["share"]).toMatchObject({ type: "integer", minimum: 1, maximum: 10000 })
		const upTo = step["upTo"] as { anyOf: Node[] }
		expect(upTo.anyOf.map((branch) => branch["type"])).toEqual(["integer", "object"])
		const entry = cashflow.properties.withdraw.items as { anyOf: Node[] }
		expect(entry.anyOf.map((branch) => branch["type"])).toEqual(["string", "object"])
		expect(JSON.stringify(entry)).toContain("downTo")
	})

	it("describes the same targets as decimal strings in the decimal form", async () => {
		const cashflow = (await schemaOf()).document.alternate.schema.properties["cashflow"] as {
			properties: { surplus: { items: { properties: { upTo: { anyOf: Node[] } } } } }
		}
		const [plain, grown] = cashflow.properties.surplus.items.properties.upTo.anyOf as [
			Node,
			{ properties: { amount: Node } },
		]
		expect(plain["type"]).toBe("string")
		expect(grown.properties.amount["type"]).toBe("string")
		expect(String(grown.properties.amount["description"])).toContain('"350.00" is 35000 satang')
	})
})
