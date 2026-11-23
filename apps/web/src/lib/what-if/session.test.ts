import { describe, expect, test } from "bun:test"
import {
	changesOf,
	hasChanges,
	isOff,
	itemSets,
	overridesOf,
	startWhatIf,
	switchedOff,
	switchedOn,
	withoutSet,
	withSet,
} from "./session"

const HASH = `jcs1:sha256:${"ab".repeat(32)}`

describe("the What-if session", () => {
	test("begins with no change, and reads as empty", () => {
		const session = startWhatIf("base", HASH)
		expect(hasChanges(session)).toBe(false)
		expect(changesOf(session)).toEqual([])
	})

	test("switching an item off and back on is a removal that comes and goes", () => {
		const off = switchedOff(startWhatIf("base", HASH), "flows.gym")
		expect(isOff(off, "flows.gym")).toBe(true)
		expect(switchedOff(off, "flows.gym").removals).toEqual(["flows.gym"])
		const on = switchedOn(off, "flows.gym")
		expect(isOff(on, "flows.gym")).toBe(false)
		expect(hasChanges(on)).toBe(false)
	})

	test("a Set on a path replaces the earlier Set of that path and keeps its place", () => {
		let session = withSet(startWhatIf("base", HASH), "flows.salary.amount", "90000.00")
		session = withSet(session, "flows.gym.amount", "120.00")
		session = withSet(session, "flows.salary.amount", "95000.00")
		expect(session.sets).toEqual([
			{ path: "flows.salary.amount", value: "95000.00" },
			{ path: "flows.gym.amount", value: "120.00" },
		])
	})

	test("dropping a Set leaves the others, and a Removal is not a Set", () => {
		let session = withSet(startWhatIf("base", HASH), "flows.salary.amount", "1")
		session = switchedOff(session, "flows.gym")
		session = withoutSet(session, "flows.salary.amount")
		expect(session.sets).toEqual([])
		expect(session.removals).toEqual(["flows.gym"])
	})

	test("changes read in words: removals first, then each Set with its value as typed", () => {
		let session = withSet(startWhatIf("base", HASH), "flows.salary.amount", "90000.50")
		session = switchedOff(session, "flows.gym")
		expect(changesOf(session)).toEqual([
			{ kind: "off", path: "flows.gym", label: "Gym switched off" },
			{
				kind: "set",
				path: "flows.salary.amount",
				label: "Salary amount set to 90000.50",
				value: "90000.50",
			},
		])
	})

	test("the Overrides are what the server sends: the Sets and the Removals, each in order", () => {
		let session = withSet(startWhatIf("base", HASH), "flows.a.amount", 1)
		session = switchedOff(session, "milestones.downsize")
		expect(overridesOf(session)).toEqual({
			sets: [{ path: "flows.a.amount", value: 1 }],
			removals: ["milestones.downsize"],
		})
	})

	test("itemSets gives one Set per field whose JSON value differs from the stored item", () => {
		const stored = { id: "salary", amount: "80000.00", frequency: "monthly", growth: null }
		const edited = { id: "salary", amount: "90000.50", frequency: "monthly", growth: null }
		expect(itemSets("flows", "salary", stored, edited)).toEqual([
			{ path: "flows.salary.amount", value: "90000.50" },
		])
	})

	test("itemSets names a new field of the item too, and gives no Set for an unchanged one", () => {
		expect(itemSets("accounts", "cash", { id: "cash" }, { id: "cash", rate: 0.5 })).toEqual([
			{ path: "accounts.cash.rate", value: 0.5 },
		])
	})
})
