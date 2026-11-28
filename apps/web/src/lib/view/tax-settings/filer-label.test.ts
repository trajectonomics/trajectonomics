import { describe, expect, test } from "bun:test"
import type { HouseholdDocument, ScenarioDocument } from "../../contract"
import { flowOwner, householdWithOwner, ownerChoices } from "../household/owner"
import { readsFilerLabels, withOwnerLabel } from "./filer-label"
import { labelEdit, OWNER_FIRST } from "./label-edit"

const HASH = `jcs1:sha256:${"0123456789abcdef".repeat(4)}`
const couple = (labels: string[]): ScenarioDocument =>
	({
		currency: "THB",
		accounts: [],
		flows: [
			{ id: "salary", kind: "income", frequency: "monthly", start: "2026-01-01" },
			{ id: "side.job", kind: "income", frequency: "monthly", start: "2026-01-01" },
		],
		levies: [{ id: "pit", measures: labels.map((label) => ({ id: label, op: "tally", label })) }],
	}) as unknown as ScenarioDocument
const filers = couple(["income.section40_1@me", "income.section40_1@partner"])
const household: HouseholdDocument = {
	schemaVersion: 2,
	people: [
		{ id: "me", role: "holder", born: "1990-01", lifeExpectancy: 90, displayLabel: "Nok" },
		{ id: "partner", role: "partner", born: "1991-01", lifeExpectancy: 90 },
		{ id: "kid", role: "dependent", relation: "child", born: "2020-01", lifeExpectancy: 90 },
	],
	anchors: [],
	owners: [{ path: "flows.side\\.job", person: "partner" }],
}
const target = { name: "joint", contentHash: HASH, plan: filers, household }
const sentLabel = (flow: string): string | undefined => {
	const result = labelEdit(target, { flow, label: "income.section40_1" })
	if (!result.ok) throw new Error("the draft makes an Edit")
	const { document } = result.edit as unknown as { document: ScenarioDocument }
	return document.flows.find((one) => one.id === flow)?.label
}

describe("a plan whose tax reads each person's income", () => {
	test("is known by its Levies' labels", () => {
		expect(readsFilerLabels(filers)).toBe(true)
		expect(readsFilerLabels(couple(["income.section40_1"]))).toBe(false)
		expect(readsFilerLabels({ ...filers, levies: [{ id: "flat" }] })).toBe(false)
	})

	test("takes a label with the Flow's Owner, matched by the path's segments", () => {
		expect(sentLabel("side.job")).toBe("income.section40_1@partner")
	})

	test("asks for the Owner first where the household states none", () => {
		expect(labelEdit(target, { flow: "salary", label: "income.section40_1" })).toEqual({
			ok: false,
			problems: { flow: OWNER_FIRST },
		})
	})

	test("moves a stored label to a new Owner, and leaves a bare one", () => {
		const labelled = {
			...filers,
			flows: filers.flows.map((flow) => ({ ...flow, label: "income.section40_1@me" })),
		}
		expect(withOwnerLabel(labelled, "salary", "partner").flows.map((flow) => flow.label)).toEqual([
			"income.section40_1@partner",
			"income.section40_1@me",
		])
		expect(withOwnerLabel(labelled, "salary", "")).toEqual(labelled)
	})
})

describe("the Owner of a Flow", () => {
	test("offers the two partners by their names, and both only where the Flow holds it", () => {
		expect(ownerChoices(household, "")).toEqual([
			{ value: "", label: "Choose" },
			{ value: "me", label: "Nok" },
			{ value: "partner", label: "Your partner" },
		])
		expect(ownerChoices(household, "shared")?.at(-1)).toEqual({
			value: "shared",
			label: "Both partners",
		})
	})

	test("is not asked where the household states none", () => {
		expect(ownerChoices({ ...household, owners: [] }, "")).toBeUndefined()
		expect(ownerChoices(null, "")).toBeUndefined()
	})

	test("is put in, replaced and taken out, and the other Owners stay", () => {
		const added = householdWithOwner(household, "salary", "me")
		expect(flowOwner(added, "salary")).toBe("me")
		expect(flowOwner(added, "side.job")).toBe("partner")
		expect(householdWithOwner(added, "side.job", "me").owners).toEqual([
			{ path: "flows.salary", person: "me" },
			{ path: "flows.side\\.job", person: "me" },
		])
		expect(householdWithOwner(added, "side.job", "").owners).toEqual([
			{ path: "flows.salary", person: "me" },
		])
	})
})
