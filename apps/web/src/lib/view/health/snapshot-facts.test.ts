import { describe, expect, test } from "bun:test"

import { type Snapshot, snapshot } from "../../contract"
import { snapshotFacts } from "./snapshot-facts"

const DEMO = await Bun.file(`${import.meta.dir}/../../../../public/demo/snapshot.json`).json()
const demo: Snapshot = snapshot.parse(DEMO)

function valueAt(facts: ReturnType<typeof snapshotFacts>, label: string): string | undefined {
	return facts.find((fact) => fact.label === label)?.value
}

describe("snapshotFacts", () => {
	test("states the As-of and horizon the Snapshot was planned from", () => {
		const facts = snapshotFacts(demo)
		expect(valueAt(facts, "As-of")).toBe("31 Oct 2026")
		expect(valueAt(facts, "Horizon")).toBe("31 Dec 2054")
	})

	test("names the Scenarios and the compared pair", () => {
		const facts = snapshotFacts(demo)
		expect(valueAt(facts, "Scenarios")).toBe(demo.params.scenarios.join(", "))
		expect(valueAt(facts, "Compared")).toBe(
			`${demo.params.compare?.a} and ${demo.params.compare?.b}`,
		)
	})

	test("says none when no Scenario or comparison is in the Snapshot", () => {
		const bare: Snapshot = {
			...demo,
			params: { ...demo.params, scenarios: [], compare: null, birthDate: null, ages: [] },
		}
		const facts = snapshotFacts(bare)
		expect(valueAt(facts, "Scenarios")).toBe("None")
		expect(valueAt(facts, "Compared")).toBe("None")
		expect(valueAt(facts, "Birth date")).toBe("Not given")
		expect(valueAt(facts, "Ages")).toBe("None")
	})

	test("counts the history dates and states the two versions", () => {
		const facts = snapshotFacts(demo)
		expect(valueAt(facts, "History dates")).toBe(`${demo.params.historyDates.length} month-ends`)
		expect(valueAt(facts, "Snapshot version")).toBe("1")
		expect(valueAt(facts, "traj version")).toBe(demo.cliVersion)
	})
})
