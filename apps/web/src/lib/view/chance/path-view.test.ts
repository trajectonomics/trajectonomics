import { describe, expect, test } from "bun:test"
import { chanceWithOutcomes, pathFixture } from "./futures.test-support"
import { pathRowsOf, returnAccounts } from "./path-rows"
import { pathHeaderOf, pathMarkers } from "./path-view"
import { lowestWhen, returnText } from "./path-words"

describe("returnText", () => {
	test("is a percent with two places and a true minus", () => {
		expect(returnText(118)).toBe("1.18%")
		expect(returnText(-120)).toBe("−1.20%")
		expect(returnText(0)).toBe("0.00%")
	})
})

describe("pathHeaderOf", () => {
	const chance = chanceWithOutcomes()

	test("says Future n, one of paths, and the month the money ran out with the shortfall the CLI states", () => {
		const header = pathHeaderOf(pathFixture(2), chance)
		expect(header.title).toBe("Future 2, one of 6")
		expect(header.ending).toMatchObject({ ranOut: "Mar 2028", unmet: "120.00" })
		expect(header.closing).toBe("0.00")
		expect(header.lowest).toEqual({
			amount: "0.00",
			when: "in the year ending Oct 2028",
			day: "2027-10-31",
		})
	})

	test("says a path lasted, and states no lowest point when the chance lists no outcomes", () => {
		const header = pathHeaderOf(pathFixture(0), { ...chance, outcomes: undefined })
		expect(header.ending.ranOut).toBeNull()
		expect(header.lowest).toBeNull()
		expect(header.closing).toBeNull()
	})
})

describe("lowestWhen", () => {
	const path = pathFixture(2)

	test("names the annual row that starts on the day the CLI states by the month it ends in", () => {
		const rows = pathRowsOf(path, "2027-10-31")
		const row = rows.findIndex((entry) => entry.marks.includes("Lowest point"))
		expect(lowestWhen(path, "2027-10-31")).toBe(`in the year ending ${rows[row]?.ends}`)
	})

	test("says only when the year starts for a day that starts no row", () => {
		expect(lowestWhen(path, "2051-10-31")).toBe("in the year starting 31 Oct 2051")
	})
})

describe("pathRowsOf", () => {
	const path = pathFixture(2)

	test("makes a row for each year with its returns by Account, in the CLI's order, and the CLI's income, spending and net worth", () => {
		expect(returnAccounts(path)).toEqual(["acct-fund", "acct-bank"])
		const rows = pathRowsOf(path, null)
		expect(rows).toHaveLength(3)
		expect(rows[0]).toMatchObject({
			ends: "Oct 2027",
			returns: ["8.82%", "1.18%"],
			income: "120000.00",
			spending: "60000.00",
			netWorth: "1250000.00",
			realNetWorth: "1200000.00",
		})
		expect(rows[1]?.returns).toEqual(["−1.20%", "1.18%"])
	})

	test("marks the year the lowest point and the run-out fall in", () => {
		const rows = pathRowsOf(path, "2027-10-31")
		expect(rows.map((row) => row.marks)).toEqual([[], ["Lowest point", "Ran out"], []])
	})

	test("leaves a return blank where traj states none for that year", () => {
		const rows = pathRowsOf({ ...path, returns: path.returns.slice(0, 1) }, null)
		expect(rows[1]?.returns).toEqual([null, null])
	})
})

describe("pathMarkers", () => {
	test("puts a run-out rule inside the year it falls in, and none for a path that lasted", () => {
		const marker = pathMarkers(pathFixture(2)).find((entry) => entry.label === "Ran out")
		expect(marker?.x).toBeGreaterThan(0)
		expect(marker?.x).toBeLessThanOrEqual(1)
		expect(pathMarkers(pathFixture(0)).some((entry) => entry.label === "Ran out")).toBe(false)
	})

	test("keeps the Milestones the Projection page draws", () => {
		const milestones = {
			name: "milestones" as const,
			count: 1,
			rows: [{ id: "fi", reached: true, date: "2027-12-01" }],
		}
		const base = pathFixture(0)
		const marks = pathMarkers({ ...base, tables: [...base.tables, milestones] })
		expect(marks.map((mark) => mark.label)).toEqual(["fi"])
	})
})
