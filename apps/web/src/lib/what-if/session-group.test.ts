import { describe, expect, test } from "bun:test"
import {
	changesOf,
	groupId,
	hasChanges,
	isGroupOff,
	isOff,
	namesChange,
	overridesOf,
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
		// The Set is sent while the group is off, so the bar lists it beside the switch, and it stays through the switch.
		expect(changesOf(withSet(kept, "accounts.boat-loan.rate", 1))).toHaveLength(2)
		expect(withoutGroup(withSet(kept, "accounts.boat-loan.rate", 1), groupId(SPEC)).sets).toEqual([
			{ path: "accounts.boat-loan.rate", value: 1 },
		])
	})

	test("off, then a try on a part the plan keeps declared, then on: the try survives", () => {
		const kept = withGroupOff(start, SPEC, SPEC.paths.slice(1))
		const tried = withSet(kept, "accounts.boat-loan.rate", 700)
		expect(changesOf(tried).map((change) => change.label)).toEqual([
			"Boat-loan rate set to 7.00%",
			"Loan boat-loan switched off",
		])
		const group = changesOf(tried).find((change) => change.kind === "group")
		if (group === undefined) throw new Error("no group change")
		const back = withoutChange(tried, group)
		expect(back.removals).toEqual([])
		expect(back.sets).toEqual([{ path: "accounts.boat-loan.rate", value: 700 }])
		expect(hasChanges(back)).toBe(true)
	})

	test("a try on a part the group keeps declared is sent, not held back by the switch", () => {
		const kept = withGroupOff(start, SPEC, SPEC.paths.slice(1))
		const tried = withSet(kept, "accounts.boat-loan.rate", 700)
		expect(overridesOf(tried)).toEqual({
			sets: [{ path: "accounts.boat-loan.rate", value: 700 }],
			removals: [...SPEC.paths.slice(1)],
			additions: [],
		})
	})

	test("another item switched off stays its own change", () => {
		const both = switchedOff(off, "flows.gym")
		expect(changesOf(both).map((change) => change.label)).toEqual([
			"Gym switched off",
			"Loan boat-loan switched off",
		])
	})
})

describe("a path belongs to at most one group", () => {
	const asset = {
		kind: "asset",
		name: "condo",
		paths: [
			"accounts.condo",
			"accounts.condo-loan",
			"flows.condo-loan-payment",
			"flows.condo-sale",
		],
	} as const
	const loan = {
		kind: "loan",
		name: "condo-loan",
		paths: ["accounts.condo-loan", "flows.condo-loan-payment"],
	} as const
	const loanOff = withGroupOff(start, loan, loan.paths)
	const assetOff = withGroupOff(start, asset, asset.paths)

	test("loan off, then asset off: the asset takes the loan's parts over, and removing it leaves nothing", () => {
		const both = withGroupOff(loanOff, asset, asset.paths)
		expect(both.groups.map(groupId)).toEqual(["asset:condo"])
		expect(both.removals).toEqual([...asset.paths])
		expect(hasChanges(withoutGroup(both, "asset:condo"))).toBe(false)
		expect(withoutGroup(both, "loan:condo-loan")).toBe(both)
	})

	test("asset off, then loan off: the loan takes them over, and the asset's other parts are back", () => {
		const both = withGroupOff(assetOff, loan, loan.paths)
		expect(both.groups.map(groupId)).toEqual(["loan:condo-loan"])
		expect(both.removals).toEqual([...loan.paths])
		expect(hasChanges(withoutGroup(both, "loan:condo-loan"))).toBe(false)
		expect(withoutGroup(both, "asset:condo")).toBe(both)
	})

	test("a try takes over the parts of an off group the same way", () => {
		const tried = withGroupTried(assetOff, loan, [{ path: "accounts.condo-loan.rate", value: 700 }])
		expect(tried.groups.map(groupId)).toEqual(["loan:condo-loan"])
		expect(tried.removals).toEqual([])
		expect(hasChanges(withoutGroup(tried, "loan:condo-loan"))).toBe(false)
	})
})

describe("a Set made before a group", () => {
	const salary = { path: "flows.salary.amount", value: "1.00" }
	const before = withSet(withSet(start, "flows.boat-loan-draw.amount", "9.00"), salary.path, "1.00")

	test("under the group's paths leaves with a switch off, and outside them stays through the switch and its removal", () => {
		const off = withGroupOff(before, SPEC, SPEC.paths)
		expect(off.sets).toEqual([salary])
		expect(withoutGroup(off, groupId(SPEC)).sets).toEqual([salary])
	})

	test("switching the group off and back on leaves an independent Set exactly as it was", () => {
		const back = withoutGroup(withGroupOff(before, SPEC, SPEC.paths), groupId(SPEC))
		expect(back.sets).toEqual([salary])
		expect(back.removals).toEqual([])
	})
})
