import { describe, expect, test } from "bun:test"
import {
	changesOf,
	clearedFields,
	hasChanges,
	isOff,
	itemSets,
	overridesOf,
	startWhatIf,
	switchedOff,
	switchedOn,
	withAddition,
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

	test("switching off an item the session adds takes it out of the session, Sets and all, with no Removal", () => {
		let session = withSet(startWhatIf("base", HASH), "flows.gym.amount", "1")
		session = withSet(session, "flows.gym", { id: "gym", amount: "2" })
		session = withAddition(session, { list: "flows", item: { id: "gym", amount: "3" } })
		session = switchedOff(session, "flows.gym")
		expect(session.sets).toEqual([])
		expect(session.additions).toEqual([])
		// The plan does not hold gym, so a Removal of it would be refused (`No key or id`).
		expect(session.removals).toEqual([])
	})

	test("switching off a plan's item holds its try out of what traj reads, and switching it on brings it back", () => {
		let session = withSet(startWhatIf("base", HASH), "flows.living.amount", "31000.00")
		session = switchedOff(session, "flows.living")
		expect(session.removals).toEqual(["flows.living"])
		// The Set stays in the session, held back: `traj` refuses a Set of a Flow a Removal took out.
		expect(session.sets).toEqual([{ path: "flows.living.amount", value: "31000.00" }])
		expect(overridesOf(session)).toEqual({
			sets: [],
			removals: ["flows.living"],
			additions: [],
		})
		expect(overridesOf(switchedOn(session, "flows.living"))).toEqual({
			sets: [{ path: "flows.living.amount", value: "31000.00" }],
			removals: [],
			additions: [],
		})
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

	test("names every field by the words its card uses, not by its key", () => {
		const labels = (path: string, value: Parameters<typeof withSet>[2]) =>
			changesOf(withSet(startWhatIf("base", HASH), path, value)).map((change) => change.label)
		expect(labels("flows.x.derive", { measures: [], result: "none" })).toEqual([
			'X share set to {"measures":[],"result":"none"}',
		])
		expect(labels("flows.x.displayLabel", "Salary")).toEqual(["X name set to Salary"])
		expect(labels("flows.x.endAt", "ms")).toEqual(["X end set to ms"])
		expect(labels("flows.x.frequency", "monthly")).toEqual(["X how often set to monthly"])
		expect(labels("accounts.x.lockedUntil", "2033-09-15")).toEqual([
			"X locked until set to 2033-09-15",
		])
		expect(labels("flows.x.realise", true)).toEqual(["X count any gain for tax set to true"])
		expect(labels("flows.x.source", "cash")).toEqual(["X move from set to cash"])
		expect(labels("flows.x.startAt", "ms")).toEqual(["X start set to ms"])
		expect(labels("flows.x.target", "fund")).toEqual(["X move to set to fund"])
		expect(labels("accounts.x.volatility", 1200)).toEqual(["X swing set to 1200"])
	})

	test("names earned income as a word, and keeps that word in the change's value", () => {
		const earned = (value: boolean) =>
			changesOf(withSet(startWhatIf("base", HASH), "flows.salary.earned", value))
		expect(earned(false)).toEqual([
			{
				kind: "set",
				path: "flows.salary.earned",
				label: "Salary income set to Passive",
				value: "Passive",
			},
		])
		expect(earned(true)).toEqual([
			{
				kind: "set",
				path: "flows.salary.earned",
				label: "Salary income set to Earned",
				value: "Earned",
			},
		])
	})

	test("the Overrides are what the server sends: the Sets and the Removals, each in order", () => {
		let session = withSet(startWhatIf("base", HASH), "flows.a.amount", 1)
		session = switchedOff(session, "milestones.downsize")
		expect(overridesOf(session)).toEqual({
			sets: [{ path: "flows.a.amount", value: 1 }],
			removals: ["milestones.downsize"],
			additions: [],
		})
	})

	test("itemSets gives one Set per field whose JSON value differs from the stored item", () => {
		const stored = { id: "salary", amount: "80000.00", frequency: "monthly", growth: null }
		const edited = { id: "salary", amount: "90000.50", frequency: "monthly", growth: null }
		expect(itemSets("flows", "salary", stored, edited)).toEqual([
			{ path: "flows.salary.amount", value: "90000.50" },
		])
	})

	test("itemSets compares structurally: an object that differs only in key order is not a change", () => {
		const stored = { id: "x-sale", derive: { op: "mul", measures: [{ account: "x", id: "a" }] } }
		const edited = { id: "x-sale", derive: { measures: [{ id: "a", account: "x" }], op: "mul" } }
		expect(itemSets("flows", "x-sale", stored, edited)).toEqual([])
		const moved = { id: "x-sale", derive: { measures: [{ id: "b", account: "x" }], op: "mul" } }
		expect(itemSets("flows", "x-sale", stored, moved)).toEqual([
			{ path: "flows.x-sale.derive", value: moved.derive },
		])
	})

	test("itemSets names a new field of the item too, and gives no Set for an unchanged one", () => {
		expect(itemSets("accounts", "cash", { id: "cash" }, { id: "cash", rate: 0.5 })).toEqual([
			{ path: "accounts.cash.rate", value: 0.5 },
		])
	})

	test("a field the form removed is a cleared field, and one stored as null or kept is not", () => {
		expect(clearedFields({ amount: "1", end: "2030-01", note: null }, { amount: "2" })).toEqual([
			"end",
		])
		expect(clearedFields({ amount: "1" }, { amount: "1" })).toEqual([])
	})
})
