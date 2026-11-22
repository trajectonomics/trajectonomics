import { describe, expect, it } from "bun:test"
import { expected, problemsFor } from "../testing"

const at = ["scenario", "milestones"] as const

function milestoneRef(to: string, months: number) {
	return { id: "c", kind: "milestone", milestone: to, months }
}

describe("check() refuses Milestone references with exact paths", () => {
	it("refuses an endAt that names no Milestone, at the Flow's endAt", () => {
		expect(problemsFor({ scenario: [["flows", 0, "endAt"], "ghost"] })).toEqual(
			expected("UNKNOWN_MILESTONE", ["scenario", "flows", 0, "endAt"]),
		)
	})

	it("reports a Milestone that names itself as a cycle, at the reference", () => {
		const list = [{ id: "a", combine: "all", criteria: [milestoneRef("a", 0)] }]
		expect(problemsFor({ scenario: [["milestones"], list] })).toEqual(
			expected("MILESTONE_CYCLE", [...at, 0, "criteria", 0, "milestone"]),
		)
	})

	it("reports exactly the cycle and the lookahead when a cycle carries a negative offset", () => {
		// a → b with months −6, and b → a closes the cycle. b is a cycle member, so it is dynamic:
		// the negative offset from a needs the future. Two problems and no others.
		const list = [
			{ id: "a", combine: "all", criteria: [milestoneRef("b", -6)] },
			{ id: "b", combine: "all", criteria: [milestoneRef("a", 0)] },
		]
		expect(problemsFor({ scenario: [["milestones"], list] })).toEqual([
			{ code: "MILESTONE_CYCLE", path: [...at, 1, "criteria", 0, "milestone"] },
			{ code: "MILESTONE_LOOKAHEAD", path: [...at, 0, "criteria", 0, "months"] },
		])
	})
})
