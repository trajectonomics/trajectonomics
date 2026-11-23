import { describe, expect, it } from "bun:test"
import simPackage from "../package.json"
import { goldenTextIn, recordGoldenTextIn } from "./golden-test-support"
import { projection } from "./projection/testing"
import {
	blockAmount,
	FLAGS,
	firstBlock,
	firstYearOf,
	HAND_YEAR,
	identityHolds,
	satang,
	YEAR,
	yearLines,
} from "./projection-breakdown-hand"
import { breakdownHome } from "./projection-breakdown-support"
import { runBody, tableOf } from "./projection-run-support"
import { capture } from "./test-support"

/*
 * `projection run --breakdown` (cli ADR-0058). The goldens pin the bytes; the hand figures in
 * projection-breakdown-hand.ts pin what the bytes mean. Combinations with the other flags are in
 * projection-breakdown-flags.test.ts.
 */

const GOLDENS = new URL("./projection/fixtures/", import.meta.url)

describe("projection run --breakdown: the bytes are pinned", () => {
	it("pins the JSON, byte for byte, with the Scenario's minted id replaced", async () => {
		const home = await breakdownHome()
		const res = await projection(home, ["run", ...FLAGS, "--breakdown"])
		expect(res.code).toBe(0)
		expect(res.err).toBe("")
		const id = runBody(res).scenario.id
		const text = `${res.out.replace(`"${id}"`, '"the-scenario-id"')}\n`
		const { engine } = JSON.parse(text) as { engine: { version: string } }
		expect(engine.version).toBe(simPackage.version)
		await recordGoldenTextIn(GOLDENS, "run-breakdown.output", text)
		expect(await goldenTextIn(GOLDENS, "run-breakdown.output")).toBe(text)
	})

	it("pins the human form, byte for byte", async () => {
		const home = await breakdownHome()
		const res = await capture(["projection", "run", ...FLAGS, "--breakdown"], { TRAJ_HOME: home })
		expect(res.code).toBe(0)
		expect(res.err).toBe("")
		await recordGoldenTextIn(GOLDENS, "run-breakdown-human.output", res.out)
		expect(await goldenTextIn(GOLDENS, "run-breakdown-human.output")).toBe(res.out)
	})
})

describe("projection run --breakdown: the lines are the plan's, worked out by hand", () => {
	it("names every line of the first year, in the engine's order, at the Currency's scale", async () => {
		const home = await breakdownHome()
		expect(await firstYearOf(home, [])).toEqual(HAND_YEAR.map((line) => ({ ...YEAR, ...line })))
	})

	it("states figures that match the annual row beside it", async () => {
		const home = await breakdownHome()
		const body = runBody(await projection(home, ["run", ...FLAGS, "--breakdown"]))
		const annual = tableOf(body, "annual").rows[0]
		if (annual === undefined) throw new Error("the result has no annual row")
		const sumOf = (group: string) =>
			HAND_YEAR.filter((line) => line.group === group).reduce(
				(total, line) => total + satang(line.amount),
				0,
			)
		expect(sumOf("income")).toBe(satang(annual.income))
		expect(sumOf("expense")).toBe(satang(annual.expense))
		// The applied Contributions are the annual field; the unfunded lines are the dropped part.
		expect(sumOf("contribution")).toBe(satang(annual.contributions))
		expect(sumOf("unfunded")).toBe(satang(annual.unfundedContributions))
	})

	it("holds the identity of sim ADR-0018 exactly, for every roll-up of a two-year horizon", async () => {
		const home = await breakdownHome()
		const body = runBody(
			await projection(home, [
				"run",
				"--scenario",
				"breakdown",
				"--as-of",
				"2026-03-31",
				"--horizon",
				"2028-03-30",
				"--breakdown",
			]),
		)
		const rows = tableOf(body, "cashflow").rows
		const indexes = [...new Set(rows.map((row) => row.index))]
		expect(indexes).toEqual([0, 1])
		for (const index of indexes) expect(identityHolds(rows, index)).toBe(true)
	})
})

describe("projection run --breakdown: the human block's totals are exact", () => {
	it("prints the first year's block with each total worked out by hand", async () => {
		const home = await breakdownHome()
		const res = await capture(["projection", "run", ...FLAGS, "--breakdown"], { TRAJ_HOME: home })
		const block = firstBlock(res.out)
		// Money in: income 120000 + withdrawals 3000 + drawn 1500. Tax: prepaid 6000 less refund 1800.
		expect(blockAmount(block, "money in")).toBe(12450000)
		expect(blockAmount(block, "income")).toBe(12000000)
		expect(blockAmount(block, "withdrawals")).toBe(300000)
		expect(blockAmount(block, "drawn")).toBe(150000)
		expect(blockAmount(block, "tax")).toBe(420000)
		expect(blockAmount(block, "spending")).toBe(5070000)
		expect(blockAmount(block, "housing")).toBe(3000000)
		expect(blockAmount(block, "(uncategorised)")).toBe(120000)
		expect(blockAmount(block, "saving")).toBe(6480000)
		expect(blockAmount(block, "not funded")).toBe(1920000)
		expect(blockAmount(block, "left over")).toBe(480000)
		// With no unmet this year, money in is money out: tax + spending + saving + left over.
		const out =
			blockAmount(block, "tax") +
			blockAmount(block, "spending") +
			blockAmount(block, "saving") +
			blockAmount(block, "left over")
		expect(out).toBe(blockAmount(block, "money in"))
	})

	it("prints the blocks after the body, and no long table", async () => {
		const home = await breakdownHome()
		const res = await capture(["projection", "run", ...FLAGS, "--breakdown"], { TRAJ_HOME: home })
		expect(res.out).not.toContain("group")
		expect(res.out.indexOf(`cash flow ${YEAR.from}`)).toBeGreaterThan(res.out.indexOf("annual ("))
	})

	it("prints no block and no cash-flow table without the flag", async () => {
		const home = await breakdownHome()
		const human = await capture(["projection", "run", ...FLAGS], { TRAJ_HOME: home })
		expect(human.out).not.toContain("cash flow")
		const body = runBody(await projection(home, ["run", ...FLAGS]))
		expect(body.tables.map((table) => table.name)).toEqual(["annual"])
		expect(
			yearLines(
				tableOf(runBody(await projection(home, ["run", ...FLAGS, "--breakdown"])), "cashflow").rows,
			),
		).toHaveLength(HAND_YEAR.length)
	})
})
