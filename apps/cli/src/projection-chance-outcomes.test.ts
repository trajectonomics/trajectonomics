import { describe, expect, it } from "bun:test"
import { goldenTextIn, recordGoldenTextIn } from "./golden-test-support"
import type { AnnualRow } from "./projection/run-view"
import { projection } from "./projection/testing"
import {
	chanceWithOutcomes,
	outcomesRun,
	pathAt,
	pathBody,
} from "./projection-chance-outcomes-support"
import { chanceBody } from "./projection-chance-support"

/*
 * `projection chance --outcomes` (cli ADR-0069): what each Market path came to, and the paths worth
 * opening. Every figure is the engine's; the tests check the CLI's reading of them against the replay
 * of one path, and `representative` against a rank worked by hand.
 */

/** A decimal money string as satang, to order and compare figures without a float. */
const satang = (money: string): bigint => BigInt(money.replace(".", ""))

const GOLDENS = new URL("./projection/fixtures/", import.meta.url)

describe("projection chance --outcomes", () => {
	it("matches the committed golden, byte for byte", async () => {
		const { home, flags } = await outcomesRun(20)
		const res = await projection(home, ["chance", ...flags, "--outcomes"])
		expect(res.code).toBe(0)
		const id = chanceBody(res).scenario.id
		const text = `${res.out.replace(`"${id}"`, '"the-scenario-id"')}\n`
		await recordGoldenTextIn(GOLDENS, "chance-outcomes.output", text)
		expect(await goldenTextIn(GOLDENS, "chance-outcomes.output")).toBe(text)
	})

	it("lists every path of a 200-path run in path order, and leaves the rest of the result as it was", async () => {
		const { home, flags } = await outcomesRun(200)
		const plain = chanceBody(await projection(home, ["chance", ...flags]))
		const asked = await chanceWithOutcomes(home, flags)
		expect(plain.outcomes).toBeUndefined()
		expect(plain.representative).toBeUndefined()
		expect(asked.outcomes).toHaveLength(200)
		expect(asked.outcomes?.map((outcome) => outcome.index)).toEqual([...Array(200).keys()])
		const { outcomes: _o, representative: _r, notes: askedNotes, ...rest } = asked
		const { notes: plainNotes, ...same } = plain
		expect(rest).toEqual(same)
		expect(askedNotes.slice(0, plainNotes.length)).toEqual(plainNotes)
		expect(askedNotes.at(-1)).toContain("traj projection path --index N")
	})

	it("states each path's figures as the Bands' money, the closing and the lowest of its roll-ups", async () => {
		const { home, flags } = await outcomesRun(200)
		const chance = await chanceWithOutcomes(home, flags)
		for (const outcome of chance.outcomes ?? []) {
			expect(outcome.closingNetWorth).toMatch(/^-?\d+\.\d{2}$/)
			expect(satang(outcome.lowestNetWorth) <= satang(outcome.closingNetWorth)).toBe(true)
			expect(outcome.runsOut).toBeNull()
		}
		// The closing net worth of every path is a value the last Band's Percentiles are read from.
		const last = chance.bands.at(-1)
		const closings = new Set((chance.outcomes ?? []).map((outcome) => outcome.closingNetWorth))
		for (const percentile of last?.netWorth ?? []) expect(closings.has(percentile.value)).toBe(true)
	})

	it("names the paths at the 10th, 50th and 90th Percentile by nearest rank, worked by hand on 10 paths", async () => {
		const { home, flags } = await outcomesRun(10)
		const chance = await chanceWithOutcomes(home, flags)
		const ascending = [...(chance.outcomes ?? [])].sort((a, b) =>
			satang(a.closingNetWorth) === satang(b.closingNetWorth)
				? a.index - b.index
				: satang(a.closingNetWorth) < satang(b.closingNetWorth)
					? -1
					: 1,
		)
		// ceil(10 * 10 / 100) = 1, ceil(50 * 10 / 100) = 5, ceil(90 * 10 / 100) = 9: the 1st, 5th and 9th of 10.
		expect(chance.representative?.p10).toBe(ascending[0]?.index ?? -1)
		expect(chance.representative?.p50).toBe(ascending[4]?.index ?? -1)
		expect(chance.representative?.p90).toBe(ascending[8]?.index ?? -1)
		expect(chance.representative?.earliestRunsOut).toBeNull()
		const lowest = [...(chance.outcomes ?? [])].sort((a, b) =>
			satang(a.lowestNetWorth) === satang(b.lowestNetWorth)
				? a.index - b.index
				: satang(a.lowestNetWorth) < satang(b.lowestNetWorth)
					? -1
					: 1,
		)
		expect(chance.representative?.lowest).toBe(lowest[0]?.index ?? -1)
	})

	it("rounds the rank up: on 3 paths the 10th, 50th and 90th Percentile are the 1st, 2nd and 3rd", async () => {
		const { home, flags } = await outcomesRun(3)
		const chance = await chanceWithOutcomes(home, flags)
		const ascending = [...(chance.outcomes ?? [])].sort((a, b) =>
			satang(a.closingNetWorth) === satang(b.closingNetWorth)
				? a.index - b.index
				: satang(a.closingNetWorth) < satang(b.closingNetWorth)
					? -1
					: 1,
		)
		expect([
			chance.representative?.p10,
			chance.representative?.p50,
			chance.representative?.p90,
		]).toEqual(ascending.map((outcome) => outcome.index))
	})

	it("agrees with the replay of a path: closing, lowest, the year it was lowest in and the run-out", async () => {
		const { home, flags } = await outcomesRun(40)
		const chance = await chanceWithOutcomes(home, flags)
		const picks = Object.values(chance.representative ?? {}).filter(
			(index): index is number => typeof index === "number",
		)
		for (const index of new Set([0, 39, ...picks])) {
			const outcome = chance.outcomes?.[index]
			const path = pathBody(await pathAt(home, flags, index))
			const annual = path.tables.find((table) => table.name === "annual")
			const rows = (annual?.rows ?? []) as AnnualRow[]
			expect(path.index).toBe(index)
			expect(rows.at(-1)?.closingNetWorth).toBe(outcome?.closingNetWorth ?? "")
			const lowest = rows.reduce((least, row) =>
				satang(row.closingNetWorth) < satang(least.closingNetWorth) ? row : least,
			)
			expect(lowest.closingNetWorth).toBe(outcome?.lowestNetWorth ?? "")
			expect(lowest.from).toBe(outcome?.lowestYear ?? "")
			expect(path.runsOut).toEqual(outcome?.runsOut ?? null)
		}
	})

	it("reports a path that ran out with its date and shortfall, and names the earliest", async () => {
		const { home, flags } = await outcomesRun(20, {
			scenario: "drained-2027",
			horizon: "2028-03-30",
		})
		const chance = await chanceWithOutcomes(home, flags)
		for (const outcome of chance.outcomes ?? []) expect(outcome.runsOut?.date).toBe("2027-06-30")
		expect(chance.representative?.earliestRunsOut).toBe(0)
		const path = pathBody(await pathAt(home, flags, 5))
		expect(path.runsOut).toEqual(chance.outcomes?.[5]?.runsOut ?? null)
	})

	it("prints every path worst closing net worth first, then the paths it names, in the human form", async () => {
		const { home, flags } = await outcomesRun(12)
		const chance = await chanceWithOutcomes(home, flags)
		const res = await (await import("./test-support")).capture(
			["projection", "chance", ...flags, "--outcomes"],
			{ TRAJ_HOME: home },
		)
		expect(res.code).toBe(0)
		const block = res.out.split("\n\n").find((part) => part.startsWith("outcomes (12 rows)")) ?? ""
		const printed = block
			.split("\n")
			.slice(2)
			.map((line) => Number(line.trim().split(/\s+/)[0]))
		const expected = [...(chance.outcomes ?? [])]
			.sort((a, b) =>
				satang(a.closingNetWorth) === satang(b.closingNetWorth)
					? a.index - b.index
					: satang(a.closingNetWorth) < satang(b.closingNetWorth)
						? -1
						: 1,
			)
			.map((outcome) => outcome.index)
		expect(printed).toEqual(expected)
		expect(res.out).toContain("representative (4 rows)")
	})
})
