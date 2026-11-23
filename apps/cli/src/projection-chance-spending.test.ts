import { describe, expect, it } from "bun:test"
import simPackage from "../package.json"
import { goldenTextIn, recordGoldenTextIn } from "./golden-test-support"
import { ILLUSTRATIVE_SEED } from "./projection/chance-testing"
import { projection, projectionHome } from "./projection/testing"
import { chanceBody, chanceFlags, modelFile } from "./projection-chance-support"
import { runBody } from "./projection-run-support"
import { ruledHome, ZERO_RETURN_MODEL } from "./projection-spending-chance-support"
import { yearsOf } from "./projection-spending-support"
import { capture } from "./test-support"

/*
 * `projection chance` on a plan with a spending rule (cli ADR-0063): the result adds the spending
 * Bands and the lowest year, and a plan without a rule keeps every byte it had.
 */

const GOLDENS = new URL("./projection/fixtures/", import.meta.url)
const HORIZON = ["--horizon", "2029-03-30"]

/** The chance flags of the ruled plan over three years, with one Return model and 20 paths. */
function flags(model: string): string[] {
	return [
		"--scenario",
		"ruled",
		"--as-of",
		"2026-03-31",
		...HORIZON,
		"--return-model",
		model,
		"--paths",
		"20",
		"--seed",
		ILLUSTRATIVE_SEED,
	]
}

describe("projection chance with a spending rule: the bytes are pinned", () => {
	it("pins the spending Bands and the lowest year of the ruled plan, byte for byte", async () => {
		const home = await ruledHome(undefined)
		const res = await projection(home, ["chance", ...flags(modelFile(home))])
		expect(res.code).toBe(0)
		expect(res.err).toBe("")
		const id = chanceBody(res).scenario.id
		const text = `${res.out.replace(`"${id}"`, '"the-scenario-id"')}\n`
		expect((JSON.parse(text) as { engine: { version: string } }).engine.version).toBe(
			simPackage.version,
		)
		await recordGoldenTextIn(GOLDENS, "chance-spending.output", text)
		expect(await goldenTextIn(GOLDENS, "chance-spending.output")).toBe(text)
	})

	it("pins the human form: the net-worth Bands, then the spending Bands and the lowest year", async () => {
		const home = await ruledHome(undefined)
		const res = await capture(["projection", "chance", ...flags(modelFile(home))], {
			TRAJ_HOME: home,
		})
		expect(res.code).toBe(0)
		await recordGoldenTextIn(GOLDENS, "chance-spending-human.output", res.out)
		expect(await goldenTextIn(GOLDENS, "chance-spending-human.output")).toBe(res.out)
		const positions = ["bands (", "spendingBands (", "lowestYearSpending ("].map((name) =>
			res.out.indexOf(name),
		)
		expect(positions.every((at) => at >= 0)).toBe(true)
		expect(positions).toEqual([...positions].sort((a, b) => a - b))
	})
})

describe("the spending Bands, worked out from the plan's own run", () => {
	/** A model that returns nothing makes every path the plan's run, so each Percentile is that run's year. */
	async function zeroed() {
		const home = await ruledHome(0)
		const model = modelFile(home, ZERO_RETURN_MODEL, "zero.json")
		const chance = chanceBody(await projection(home, ["chance", ...flags(model)]))
		const run = runBody(
			await projection(home, [
				"run",
				"--scenario",
				"ruled",
				"--as-of",
				"2026-03-31",
				...HORIZON,
				"--spending",
			]),
		)
		return { chance, years: yearsOf(run, "spending") }
	}

	it("equals what the rule paid in each roll-up, at all five levels", async () => {
		const { chance, years } = await zeroed()
		expect(years.map((year) => year.amount)).toEqual(["25141.98", "29941.98", "34741.98"])
		expect(chance.spendingBands).toHaveLength(3)
		chance.spendingBands?.forEach((band, at) => {
			expect(band.index).toBe(at)
			expect(band.spending.map((entry) => entry.level)).toEqual([10, 25, 50, 75, 90])
			for (const entry of band.spending) expect(entry.value).toBe(years[at]?.paid ?? "")
		})
	})

	it("states the lowest year as the least of the whole years, over every path", async () => {
		const { chance, years } = await zeroed()
		expect(chance.lowestYearSpending?.paths).toBe(20)
		expect(chance.lowestYearSpending?.spending.map((entry) => entry.level)).toEqual([
			10, 25, 50, 75, 90,
		])
		for (const entry of chance.lowestYearSpending?.spending ?? []) {
			expect(entry.value).toBe(years[0]?.paid ?? "")
		}
	})

	it("prints a few of the Bands in the human form, the first, every fifth and the last", async () => {
		const { chance } = await zeroed()
		const table = chance.tables.find((entry) => entry.name === "spendingBands")
		expect(table?.rows).toEqual([
			{ index: 0, to: "2027-03-30", p10: "25141.98", p50: "25141.98", p90: "25141.98" },
			{ index: 2, to: "2029-03-30", p10: "34741.98", p50: "34741.98", p90: "34741.98" },
		])
	})

	it("says what the Bands count in the notes", async () => {
		const { chance } = await zeroed()
		expect(chance.notes.join(" ")).toContain("the 20 of 20 paths that have one")
	})
})

describe("projection chance without a spending rule", () => {
	it("adds no key and no table, so the result is what it was", async () => {
		const home = await projectionHome()
		const body = chanceBody(await projection(home, ["chance", ...chanceFlags(modelFile(home))]))
		expect(Object.keys(body)).not.toContain("spendingBands")
		expect(Object.keys(body)).not.toContain("lowestYearSpending")
		expect(body.tables.map((table) => table.name)).toEqual(["bands"])
		expect(body.notes.join(" ")).not.toContain("spending")
	})
})
