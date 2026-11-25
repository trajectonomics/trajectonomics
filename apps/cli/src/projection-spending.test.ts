import { describe, expect, it } from "bun:test"
import simPackage from "../package.json"
import { goldenTextIn, recordGoldenTextIn } from "./golden-test-support"
import { projection } from "./projection/testing"
import { exampleHome } from "./projection-accounts-support"
import { runBody, tableOf } from "./projection-run-support"
import {
	EXAMPLE_FLAGS,
	major,
	minor,
	RAISE_FLAGS,
	raiseHome,
	yearsOf,
} from "./projection-spending-support"
import { capture } from "./test-support"

/*
 * `projection run --spending` (cli ADR-0063). The goldens pin the bytes of the worked example's
 * retirement rule and of a plan that raises and cuts; the figures the engine states are checked by
 * hand beside them, in exact integers, from the portfolio the same row states.
 */

const GOLDENS = new URL("./projection/fixtures/", import.meta.url)

/** The result's own bytes, with the Scenario's minted id replaced by a stable token. */
function goldenText(res: { out: string }): string {
	const id = (JSON.parse(res.out) as { scenario: { id: string } }).scenario.id
	return `${res.out.replace(`"${id}"`, '"the-scenario-id"')}\n`
}

async function pinned(name: string, res: { out: string }): Promise<void> {
	const text = goldenText(res)
	expect((JSON.parse(text) as { engine: { version: string } }).engine.version).toBe(
		simPackage.version,
	)
	await recordGoldenTextIn(GOLDENS, name, text)
	expect(await goldenTextIn(GOLDENS, name)).toBe(text)
}

describe("projection run --spending: the bytes are pinned", () => {
	it("pins the example's retirement rule: its first year, then its cuts", async () => {
		const res = await projection(await exampleHome(), ["run", ...EXAMPLE_FLAGS, "--spending"])
		expect(res.code).toBe(0)
		expect(res.err).toBe("")
		await pinned("run-spending.output", res)
	})

	it("pins a plan that holds a year, raises twice and cuts twice", async () => {
		const res = await projection(await raiseHome(), ["run", ...RAISE_FLAGS, "--spending"])
		expect(res.code).toBe(0)
		expect(res.err).toBe("")
		await pinned("run-spending-raise.output", res)
	})

	it("pins the human form: one table per rule Flow, a row per Rule year", async () => {
		const res = await capture(["projection", "run", ...EXAMPLE_FLAGS, "--spending"], {
			TRAJ_HOME: await exampleHome(),
		})
		expect(res.code).toBe(0)
		expect(res.err).toBe("")
		await recordGoldenTextIn(GOLDENS, "run-spending-human.output", res.out)
		expect(await goldenTextIn(GOLDENS, "run-spending-human.output")).toBe(res.out)
	})
})

describe("the example's rule, worked out by hand", () => {
	const run = async () =>
		runBody(await projection(await exampleHome(), ["run", ...EXAMPLE_FLAGS, "--spending"]))

	it("begins on 2045-01-01, the day `retire` fires, and fixes 4% of what the portfolio is worth", async () => {
		const body = await run()
		const [first] = yearsOf(body, "retirement-spending")
		expect(first?.date).toBe("2045-01-01")
		expect(first?.action).toBe("none")
		// floor(portfolio x 400 / 10000), in exact minor units.
		expect(first?.amount).toBe(major((minor(first?.portfolio ?? "0") * 400n) / 10_000n))
		expect(first?.paid).toBe(first?.amount ?? "")
		// The rate the engine states, floored to a basis point: floor(amount x 10000 / portfolio) = 399.
		expect(first?.withdrawalRate).toBe("3.99")
	})

	it("cuts in 2049: last year's amount grown 3%, and 10% off it, because the share passed 4.8%", async () => {
		const years = yearsOf(await run(), "retirement-spending")
		const before = years.find((year) => year.date === "2048-01-01")
		const cut = years.find((year) => year.date === "2049-01-01")
		expect(cut?.action).toBe("cut")
		// Year 2048's amount grown one year by 3% inflation (half up), then 10% off (floor).
		const grown = (minor(before?.amount ?? "0") * 10_300n + 5_000n) / 10_000n
		expect(cut?.amount).toBe(major((grown * 9_000n) / 10_000n))
		// The cut's condition, exact: grown x 10000 x 10000 > portfolio x 400 x (10000 + 2000).
		const portfolio = minor(cut?.portfolio ?? "0")
		expect(grown * 10_000n * 10_000n > portfolio * 400n * 12_000n).toBe(true)
	})

	it("holds a year inside the bands: 2046 is 2045's amount grown 3%", async () => {
		const years = yearsOf(await run(), "retirement-spending")
		const first = years.find((year) => year.date === "2045-01-01")
		const second = years.find((year) => year.date === "2046-01-01")
		expect(second?.action).toBe("none")
		expect(second?.amount).toBe(major((minor(first?.amount ?? "0") * 10_300n + 5_000n) / 10_000n))
	})

	it("states a rule year for every year from the retirement, the last one whole", async () => {
		const years = yearsOf(await run(), "retirement-spending")
		expect(years.map((year) => year.date.slice(0, 4))).toEqual(
			Array.from({ length: 11 }, (_, at) => String(2045 + at)),
		)
		for (const year of years) expect(year.paid).toBe(year.amount)
	})
})

describe("a rule that raises and cuts, worked out by hand", () => {
	const run = async () =>
		runBody(await projection(await raiseHome(), ["run", ...RAISE_FLAGS, "--spending"]))

	it("fixes 4% of the portfolio in the first year, then holds, raises twice and cuts twice", async () => {
		const years = yearsOf(await run(), "spending")
		expect(years.map((year) => year.action)).toEqual(["none", "raise", "raise", "cut", "cut"])
		expect(years[0]?.amount).toBe(major((minor(years[0]?.portfolio ?? "0") * 400n) / 10_000n))
	})

	it("raises by 10% of last year's amount while the share is more than 10% under 4%", async () => {
		const years = yearsOf(await run(), "spending")
		for (const at of [1, 2]) {
			const before = minor(years[at - 1]?.amount ?? "0")
			const portfolio = minor(years[at]?.portfolio ?? "0")
			// Inflation is 0, so last year grown is last year. Condition: before x 10^8 < portfolio x 400 x 9000.
			expect(before * 100_000_000n < portfolio * 400n * 9_000n).toBe(true)
			expect(years[at]?.amount).toBe(major((before * 11_000n) / 10_000n))
		}
	})

	it("cuts by 10% when the boat has pushed the share past 4.8%", async () => {
		const years = yearsOf(await run(), "spending")
		for (const at of [3, 4]) {
			const before = minor(years[at - 1]?.amount ?? "0")
			const portfolio = minor(years[at]?.portfolio ?? "0")
			expect(before * 100_000_000n > portfolio * 400n * 12_000n).toBe(true)
			expect(years[at]?.amount).toBe(major((before * 9_000n) / 10_000n))
		}
		// The 2029 share is above 100% of nothing, never a cap: it is 6.01% of a portfolio the boat halved.
		expect(years[3]?.withdrawalRate).toBe("6.01")
	})

	it("states each year's withdrawal rate as the amount's share of its portfolio, floored to a basis point", async () => {
		for (const year of yearsOf(await run(), "spending")) {
			const bps = (minor(year.amount) * 10_000n) / minor(year.portfolio)
			expect(year.withdrawalRate).toBe(`${bps / 100n}.${String(bps % 100n).padStart(2, "0")}`)
		}
	})
})

describe("--spending adds one table and changes nothing else", () => {
	it("leaves every other table, and the whole of a run without it, as it was", async () => {
		const home = await exampleHome()
		const plain = runBody(await projection(home, ["run", ...EXAMPLE_FLAGS]))
		const asked = runBody(await projection(home, ["run", ...EXAMPLE_FLAGS, "--spending"]))
		expect(plain.tables.map((table) => table.name)).toEqual(["annual", "milestones"])
		expect(asked.tables.map((table) => table.name)).toEqual([
			"annual",
			"spendingRules",
			"milestones",
		])
		const { tables: askedTables, ...askedRest } = asked
		const { tables: plainTables, ...plainRest } = plain
		expect(askedRest).toEqual(plainRest)
		expect(JSON.stringify(askedTables.filter((table) => table.name !== "spendingRules"))).toBe(
			JSON.stringify(plainTables),
		)
	})

	it("prints nothing of it in the human form without the flag, and a table per rule Flow with it", async () => {
		const home = await exampleHome()
		const plain = await capture(["projection", "run", ...EXAMPLE_FLAGS], { TRAJ_HOME: home })
		const asked = await capture(["projection", "run", ...EXAMPLE_FLAGS, "--spending"], {
			TRAJ_HOME: home,
		})
		expect(plain.out).not.toContain("spendingRules")
		expect(asked.out).toContain("spendingRules retirement-spending (11 rows)")
		expect(asked.out.startsWith(plain.out.trimEnd())).toBe(true)
	})

	it("states an empty table for a plan with no rule, and no engine figure of its own", async () => {
		const home = await exampleHome()
		const body = runBody(
			await projection(home, ["run", ...EXAMPLE_FLAGS.slice(0, -1), "2030-01-01", "--spending"]),
		)
		// The rule is gated on `retire`, which has not fired by 2030: the Flow exists and has no Rule year yet.
		expect(tableOf(body, "spendingRules")).toEqual({ name: "spendingRules", count: 0, rows: [] })
	})
})
