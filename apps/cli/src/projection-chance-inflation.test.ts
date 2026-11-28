import { describe, expect, it } from "bun:test"
import type { ReturnModel } from "@trajectonomics/core/sim"
import { VOLATILE_PLAN } from "./projection/plan-model-testing"
import { projection, projectionHome } from "./projection/testing"
import { FULL, inflationHome, planFlags } from "./projection-chance-inflation-support"
import { chanceBody } from "./projection-chance-support"
import { applyScenario, errorOf } from "./scenario-test-support"
import { capture } from "./test-support"

/*
 * The plan's inflation volatility reaches `projection chance` and `projection model` (sim ADR 0033,
 * cli ADR 0085): the plan model refuses only when neither an Account nor the Scenario swings, the
 * echo states the factor, and the Bands gain their median in today's money. The CLI ships no
 * figure: every rate here is the test's own.
 */

describe("a plan whose only swing is inflation", () => {
	it("is accepted, echoes the rate and spread, and states the real Bands", async () => {
		const home = await inflationHome()
		const res = await projection(home, planFlags("inflationary"))
		expect(res.code).toBe(0)
		const body = chanceBody(res)
		expect(body.returnModel).toEqual({
			source: "plan",
			buckets: 16,
			accounts: [],
			inflation: { rate: 250, volatility: 150 },
		})
		expect(body.realBands).toHaveLength(body.bands.length)
		expect(body.realBands?.[0]?.netWorth.map((entry) => entry.level)).toEqual([10, 25, 50, 75, 90])
	})

	it("adds the median in today's money right after the nominal median", async () => {
		const home = await inflationHome()
		const body = chanceBody(await projection(home, planFlags("inflationary")))
		const table = body.tables.find((entry) => entry.name === "bands")
		expect(table?.name).toBe("bands")
		if (table?.name !== "bands") return
		const real = body.realBands?.find((band) => band.index === table.rows[0]?.index)
		const median = real?.netWorth.find((entry) => entry.level === 50)?.value
		expect(table.rows[0]?.p50Real).toBe(median)
	})

	it("states the clamp when the spread pushes a bucket past the range", async () => {
		const home = await inflationHome()
		const body = chanceBody(await projection(home, planFlags("clamped")))
		expect(body.returnModel?.inflation).toEqual({ rate: 9900, volatility: 1000 })
		const note = body.notes.find((entry) => entry.includes("buckets of inflation"))
		expect(note).toMatch(
			/^The plan's Return model clamped \d+ of its 16 buckets of inflation to the range from -9999 to 10000 basis points a year\.$/,
		)
		expect(Number(note?.match(/clamped (\d+)/)?.[1])).toBeGreaterThan(0)
	})

	it("keeps the Account echo when an Account swings too", async () => {
		const home = await inflationHome()
		const body = chanceBody(await projection(home, planFlags("swinging")))
		expect(body.returnModel?.accounts).toHaveLength(1)
		expect(body.returnModel?.inflation).toEqual({ rate: 250, volatility: 150 })
	})
})

describe("projection model with an inflation factor", () => {
	it("prints the factor in JSON and sums its weights to 2^32", async () => {
		const home = await inflationHome()
		const res = await projection(home, ["model", "--scenario", "inflationary", "--buckets", "16"])
		expect(res.code).toBe(0)
		const model = JSON.parse(res.out) as ReturnModel
		expect(model.accounts).toEqual([])
		expect(model.inflation?.buckets).toHaveLength(16)
		expect(model.inflation?.buckets.reduce((sum, bucket) => sum + bucket.weight, 0)).toBe(FULL)
	})

	it("prints the text summary: buckets, mean and range", async () => {
		const home = await inflationHome()
		const res = await capture(
			["projection", "model", "--scenario", "inflationary", "--buckets", "16"],
			{ TRAJ_HOME: home },
		)
		expect(res.code).toBe(0)
		expect(res.out).toMatch(
			/^Inflation: 16 buckets, mean 250 bps, from -?\d+ to -?\d+ bps a year$/m,
		)
	})
})

describe("a plan with neither kind of swing", () => {
	it("is refused, and the sentence and hint name both fields", async () => {
		const home = await inflationHome()
		const chance = await projection(home, planFlags("base"))
		expect(chance.code).toBe(2)
		const error = errorOf(chance)
		expect(error.path).toBe("--return-model")
		expect(error.message).toContain("volatility")
		expect(error.message).toContain("economy.inflationVolatility")
		expect(error.hint).toContain("volatility")
		expect(error.hint).toContain("economy.inflationVolatility")

		const model = await projection(home, ["model", "--scenario", "base"])
		expect(model.code).toBe(2)
		expect(errorOf(model).path).toBe("--scenario")
		expect(errorOf(model).message).toContain("economy.inflationVolatility")
	})
})

describe("the chance's notes with an inflation factor", () => {
	it("says only the median is in today's money", async () => {
		const home = await inflationHome()
		const body = chanceBody(await projection(home, planFlags("inflationary")))
		const note = body.notes.find((entry) => entry.startsWith("The chance is over the Return model"))
		expect(note).toContain("and every figure is nominal except the median in today's money.")
	})

	it("keeps the nominal sentence when the model has no inflation factor", async () => {
		const home = await projectionHome()
		const applied = await applyScenario(home, "volatile", VOLATILE_PLAN)
		expect(applied.code).toBe(0)
		const body = chanceBody(await projection(home, planFlags("volatile")))
		expect(body.realBands).toBeUndefined()
		expect(body.notes).toContain(
			`The chance is over the Return model "${body.definition.modelId}" with seed ${body.definition.seed}, and every figure is nominal.`,
		)
	})

	it("names the Scenario's inflation spread beside the Accounts that swing", async () => {
		const home = await inflationHome()
		const body = chanceBody(await projection(home, planFlags("swinging")))
		const note = body.notes.find((entry) => entry.startsWith("The Return model is the plan's own"))
		expect(note).toContain("and the Scenario's inflation spread (rate 250 bps, volatility 150 bps)")
	})
})

describe("the chance's help texts", () => {
	it("name economy.inflationVolatility in the method and the --return-model description", async () => {
		const res = await capture(["projection", "chance", "--help"])
		expect(res.code).toBe(0)
		const lines = res.out.split("\n")
		expect(lines.find((line) => line.startsWith("Runs the Scenario"))).toContain(
			"economy.inflationVolatility",
		)
		expect(lines.find((line) => line.includes("--return-model <string>"))).toContain(
			"economy.inflationVolatility",
		)
	})
})
