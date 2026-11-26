import { describe, expect, test } from "bun:test"
import type { Json } from "./json"
import {
	changesOf,
	overridesOf,
	startWhatIf,
	withAddition,
	withGroupOff,
	withoutGroup,
	withSet,
} from "./session"
import { groupId } from "./session-group"
import { withoutChange } from "./session-without"

const HASH = `jcs1:sha256:${"ab".repeat(32)}`
const SPEC = {
	kind: "salary",
	name: "salary",
	paths: ["flows.salary", "flows.salary-employer"],
} as const
const SHARE = {
	id: "salary-employer",
	kind: "contribution",
	target: "fund",
	funding: "employer",
	frequency: "monthly",
	start: "2026-11-01",
	derive: {
		measures: [
			{ id: "pay", op: "flow", flow: "salary" },
			{ id: "share", op: "scale", of: "pay", num: 500, den: 10000, rounding: "floor" },
		],
		result: "share",
	},
}

describe("a salary and its employer share are one unit", () => {
	test("switching a stored share off removes both, and the bar lists one change", () => {
		const off = withGroupOff(startWhatIf("base", HASH), SPEC, SPEC.paths)
		expect(off.removals).toEqual([...SPEC.paths])
		expect(changesOf(off).map((change) => change.label)).toEqual([
			"Salary and its employer share switched off",
		])
	})

	test("switching on restores both, and removing the bar's chip is that switch", () => {
		const kept = withSet(startWhatIf("base", HASH), "flows.gym.amount", "10.00")
		const off = withGroupOff(kept, SPEC, SPEC.paths)
		const change = changesOf(off).find((one) => one.kind === "group")
		if (change === undefined) throw new Error("no group change")
		const on = withoutChange(off, change)
		expect(on.removals).toEqual([])
		expect(on.groups).toEqual([])
		expect(on.sets).toEqual([{ path: "flows.gym.amount", value: "10.00" }])
	})

	test("a share the session adds stays held out of what traj reads, and comes back with the salary", () => {
		const added = withAddition(startWhatIf("base", HASH), { list: "flows", item: SHARE })
		const off = withGroupOff(added, SPEC, SPEC.paths)
		// The plan does not hold the Addition: a Removal of its id would be refused, so only the salary is removed.
		expect(overridesOf(off)).toEqual({
			sets: [],
			removals: ["flows.salary"],
			additions: [],
		})
		expect(off.additions).toEqual([{ list: "flows", item: SHARE }])
		expect(overridesOf(withoutGroup(off, groupId(SPEC)))).toEqual({
			sets: [],
			removals: [],
			additions: [{ list: "flows", item: SHARE }],
		})
	})

	test("a try held while the salary is off is sent again when it switches on", () => {
		const tried = withSet(startWhatIf("base", HASH), "flows.salary.amount", "95000.00" as Json)
		const off = withGroupOff(tried, SPEC, SPEC.paths)
		expect(overridesOf(off)).toEqual({ sets: [], removals: [...SPEC.paths], additions: [] })
		expect(overridesOf(withoutGroup(off, groupId(SPEC)))).toEqual({
			sets: [{ path: "flows.salary.amount", value: "95000.00" }],
			removals: [],
			additions: [],
		})
	})
})
