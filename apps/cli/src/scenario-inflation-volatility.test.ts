import { describe, expect, it } from "bun:test"
import { PROJECTION_SCENARIO } from "./projection/testing"
import { applyScenario, errorOf, scenario, scenarioHome } from "./scenario-test-support"
import { capture } from "./test-support"

/*
 * `economy.inflationVolatility` is the Scenario's yearly inflation spread (sim ADR 0033, cli ADR
 * 0085): `scenario apply` takes it, `--set` may begin the absent key, `traj schema` describes it,
 * and `--decimal` leaves it as the integer of basis points `inflation` is beside it.
 */

async function baseHome(): Promise<string> {
	const home = scenarioHome()
	const applied = await applyScenario(home, "base", PROJECTION_SCENARIO)
	if (applied.code !== 0) throw new Error(applied.err)
	return home
}

describe("the Scenario's inflation volatility", () => {
	it("is begun by a --set on a plan that leaves it out, and stays integer basis points", async () => {
		const home = await baseHome()
		const res = await capture(
			["scenario", "apply", "base", "--set", "economy.inflationVolatility=150", "--json"],
			{ TRAJ_HOME: home },
		)
		expect(res.code).toBe(0)
		const shown = JSON.parse((await scenario(home, ["show", "base"])).out).scenario.document
		expect(shown.economy).toMatchObject({ inflation: 250, inflationVolatility: 150 })
		const decimal = JSON.parse((await scenario(home, ["show", "base", "--decimal"])).out)
		expect(decimal.scenario.document.economy.inflationVolatility).toBe(150)
	})

	it("is refused above 10000 basis points and as a fraction, in the words of a rate", async () => {
		const home = await baseHome()
		const high = await capture(
			["scenario", "apply", "base", "--set", "economy.inflationVolatility=10001", "--json"],
			{ TRAJ_HOME: home },
		)
		expect(high.code).toBe(2)
		expect(errorOf(high).details).toMatchObject({ code: "RATE_OUT_OF_RANGE" })
		const fraction = await capture(
			["scenario", "apply", "base", "--set", "economy.inflationVolatility=1.5", "--json"],
			{ TRAJ_HOME: home },
		)
		expect(fraction.code).toBe(2)
		expect(errorOf(fraction).message).toContain("basis points, a whole number")
	})

	it("is published by traj schema with its bounds and what reads it", async () => {
		const res = await capture(["schema", "scenario", "apply", "--json"], {
			TRAJ_HOME: scenarioHome(),
		})
		expect(res.code).toBe(0)
		const economy = JSON.parse(res.out).document.schema.properties.economy.properties
		expect(economy.inflationVolatility).toMatchObject({
			type: "integer",
			minimum: 0,
			maximum: 10000,
		})
		const description = String(economy.inflationVolatility.description)
		expect(description).toContain("Only the chance of success reads")
		expect(description).toContain("Absent or 0")
		expect(description).toContain("caller's own")
	})
})
