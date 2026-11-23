import { describe, expect, test } from "bun:test"
import {
	changesOf,
	groupId,
	hasChanges,
	isGroupOff,
	isOff,
	namesChange,
	startWhatIf,
	switchedOff,
	withGroupOff,
	withGroupTried,
	withoutGroup,
	withSet,
} from "./session"
import { withoutChange } from "./session-without"

const SPEC = {
	kind: "loan",
	name: "boat-loan",
	paths: ["accounts.boat-loan", "flows.boat-loan-payment", "flows.boat-loan-draw"],
} as const
const TRIED = [
	{ path: "accounts.boat-loan.rate", value: 700 },
	{ path: "flows.boat-loan-payment.level", value: { principal: "400000.00" } },
	{ path: "flows.boat-loan-draw.amount", value: "400000.00" },
]
const start = startWhatIf("base", "hash")

describe("a loan's Sets are one change", () => {
	test("the panel lists one change worded in words, with no field or figure, and removing it removes every Set", () => {
		const session = withGroupTried(withSet(start, "flows.salary.amount", "1.00"), SPEC, TRIED)
		const changes = changesOf(session)
		expect(changes.map((change) => change.label)).toEqual([
			"Salary amount set to 1.00",
			"Loan boat-loan tried as edited",
		])
		const group = changes[1]
		if (group === undefined) throw new Error("no group change")
		expect(group.kind).toBe("group")
		const without = withoutChange(session, group)
		expect(without.sets).toEqual([{ path: "flows.salary.amount", value: "1.00" }])
		expect(without.groups).toEqual([])
	})

	test("a later try replaces the earlier one, and a try that changes nothing leaves the loan as stored", () => {
		const first = withGroupTried(start, SPEC, TRIED)
		const second = withGroupTried(first, SPEC, [TRIED[2] ?? { path: "", value: null }])
		expect(second.sets.map((set) => set.path)).toEqual(["flows.boat-loan-draw.amount"])
		expect(second.groups).toHaveLength(1)
		const none = withGroupTried(second, SPEC, [])
		expect(hasChanges(none)).toBe(false)
		expect(none.groups).toEqual([])
	})

	test("a refusal that names a part, or a field of one, is shown at the loan's change", () => {
		const group = changesOf(withGroupTried(start, SPEC, TRIED))[0]
		if (group === undefined) throw new Error("no group change")
		expect(namesChange(group, "flows.boat-loan-draw")).toBe(true)
		expect(namesChange(group, "accounts.boat-loan.rate")).toBe(true)
		expect(namesChange(group, "flows.salary")).toBe(false)
		expect(namesChange(group, "flows.boat-loan-draw-2")).toBe(false)
	})
})

describe("a loan switched off is one group", () => {
	const off = withGroupOff(start, SPEC, SPEC.paths)

	test("every part is removed, and the panel lists one change", () => {
		expect(off.removals).toEqual([...SPEC.paths])
		expect(isGroupOff(off, groupId(SPEC))).toBe(true)
		expect(changesOf(off).map((change) => change.label)).toEqual(["Loan boat-loan switched off"])
	})

	test("one Remove this change puts every part back", () => {
		const group = changesOf(off)[0]
		if (group === undefined) throw new Error("no group change")
		const back = withoutChange(off, group)
		expect(back.removals).toEqual([])
		expect(hasChanges(back)).toBe(false)
	})

	test("switching it off drops an earlier try, and trying it drops the switch", () => {
		const tried = withGroupTried(start, SPEC, TRIED)
		const offAfter = withGroupOff(tried, SPEC, SPEC.paths)
		expect(offAfter.sets).toEqual([])
		const triedAfter = withGroupTried(off, SPEC, TRIED)
		expect(triedAfter.removals).toEqual([])
		expect(isGroupOff(triedAfter, groupId(SPEC))).toBe(false)
	})

	test("a part the plan keeps declared is not removed, but still belongs to the group", () => {
		const kept = withGroupOff(start, SPEC, SPEC.paths.slice(1))
		expect(kept.removals).not.toContain("accounts.boat-loan")
		expect(isOff(kept, "accounts.boat-loan")).toBe(false)
		expect(changesOf(withSet(kept, "accounts.boat-loan.rate", 1))).toHaveLength(1)
		expect(withoutGroup(withSet(kept, "accounts.boat-loan.rate", 1), groupId(SPEC)).sets).toEqual(
			[],
		)
	})

	test("another item switched off stays its own change", () => {
		const both = switchedOff(off, "flows.gym")
		expect(changesOf(both).map((change) => change.label)).toEqual([
			"Gym switched off",
			"Loan boat-loan switched off",
		])
	})
})
