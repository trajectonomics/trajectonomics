import { describe, expect, test } from "bun:test"
import { type ProjectionRun, type Snapshot, snapshot } from "../src/lib/contract"
import { demoSnapshotText } from "./demo-snapshot"

// The Demo's `separate` and `joint` Scenarios share two salaries, a household and its claims, so the Demo can show
// what filing separately saves (cli ADR-0075). The 2026 figures below are worked by hand from the Demo's own inputs:
//   `me` salary 900,000.00 for January to October, then 90,000.00 for November and December = 1,080,000.00;
//   partner 420,000.00 and then 42,000.00 twice = 504,000.00.
// Each Return's s.42 bis expense is 50% capped at 100,000.00. A separate Return claims one personal allowance,
// the child, one's own parents and one's own life premium; a joint Return claims two personal allowances, the
// child once, the partner's two parents and both premiums (15,000.00 + 12,000.00).
//   `me` separate:  1,080,000 - 100,000 - (60,000 + 30,000 + 15,000) = 875,000  -> tax  90,000.00
//   partner separate: 504,000 - 100,000 - (60,000 + 30,000 + 60,000 + 12,000) = 242,000 -> tax 4,600.00
//   joint:          1,584,000 - 200,000 - (120,000 + 30,000 + 60,000 + 27,000) = 1,147,000 -> tax 151,750.00
// Filing separately therefore costs 94,600.00 against the joint Return's 151,750.00, and saves 57,150.00.

const DEMO: Snapshot = snapshot.parse(JSON.parse(await demoSnapshotText()))

function runOf(name: string): ProjectionRun {
	const read = DEMO.reads.projections[name]
	if (read?.ok !== true) throw new Error(`the Demo has no ${name} projection`)
	return read.data
}

function yearOf(name: string, levy: string) {
	const year = runOf(name).taxYears.find((one) => one.from === "2026-01-01" && one.levy === levy)
	if (year === undefined) throw new Error(`the Demo's ${name} has no 2026 Levy ${levy}`)
	return year
}

describe("the Demo's separate and joint counterparts", () => {
	test("both Scenarios exist, each with its own filing status", () => {
		expect(DEMO.params.scenarios).toContain("separate")
		expect(DEMO.params.scenarios).toContain("joint")
		const separate = DEMO.reads.documents["separate"]
		const joint = DEMO.reads.documents["joint"]
		if (separate?.ok !== true || joint?.ok !== true) throw new Error("a document is missing")
		expect(separate.data.scenario.tax?.filingStatus).toBe("married_separate")
		expect(joint.data.scenario.tax?.filingStatus).toBe("married_joint")
	})

	test("the separate filing's two 2026 Returns are the hand-checked figures", () => {
		expect(yearOf("separate", "th-2026-pit@me")).toMatchObject({
			filer: "me",
			due: "90000.00",
			walk: {
				assessable: "1080000.00",
				expenses: "100000.00",
				allowances: "105000.00",
				taxableIncome: "875000.00",
			},
		})
		expect(yearOf("separate", "th-2026-pit@partner")).toMatchObject({
			filer: "partner",
			due: "4600.00",
			walk: {
				assessable: "504000.00",
				expenses: "100000.00",
				allowances: "162000.00",
				taxableIncome: "242000.00",
			},
		})
	})

	test("the joint 2026 Return is the hand-checked figure", () => {
		expect(yearOf("joint", "th-2026-pit")).toMatchObject({
			due: "151750.00",
			walk: {
				assessable: "1584000.00",
				expenses: "200000.00",
				allowances: "237000.00",
				taxableIncome: "1147000.00",
			},
		})
	})
})
