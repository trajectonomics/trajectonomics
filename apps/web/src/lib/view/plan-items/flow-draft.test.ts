import { describe, expect, test } from "bun:test"
import { planDocument } from "./fixtures.test-support"
import { flowFromDraft } from "./flow-draft"
import { type FlowDraft, flowDraftOf } from "./flows"

const blank: FlowDraft = {
	category: "",
	displayLabel: "",
	name: "",
	frequency: "monthly",
	start: "2027-01-01",
	end: "",
	amount: "1000",
	growth: "inflation",
	rate: "",
	earned: true,
}

describe("saving a Flow that changed nothing", () => {
	test("gives back the stored Flow, field for field, so the document is the same", () => {
		for (const flow of planDocument().flows) {
			if (flow.derive !== undefined) continue
			const result = flowFromDraft(flowDraftOf(flow), {
				kind: flow.kind === "expense" ? "expense" : "income",
				existing: flow,
				taken: [],
			})
			expect(result).toEqual({ ok: true, flow })
		}
	})
})

describe("a new Flow", () => {
	test("saves the display label trimmed, and leaves it out when the field is empty", () => {
		const labelled = flowFromDraft(
			{ ...blank, name: "School fees", displayLabel: "  School fees  " },
			{ kind: "expense", taken: [] },
		)
		expect(labelled.ok && labelled.flow.displayLabel).toBe("School fees")
		const bare = flowFromDraft({ ...blank, name: "Rent" }, { kind: "expense", taken: [] })
		expect(bare.ok && bare.flow).not.toHaveProperty("displayLabel")
	})

	test("refuses a display label over 80 characters at its field", () => {
		const result = flowFromDraft(
			{ ...blank, name: "Rent", displayLabel: "a".repeat(81) },
			{ kind: "expense", taken: [] },
		)
		expect(result.ok === false && result.problems["displayLabel"]).toContain(
			"at most 80 characters",
		)
	})

	test("refuses an invisible or bidirectional character at the display label field", () => {
		for (const label of ["Rent\u200b", "Rent\u202e"]) {
			const result = flowFromDraft(
				{ ...blank, name: "Rent", displayLabel: label },
				{
					kind: "expense",
					taken: [],
				},
			)
			expect(result.ok === false && result.problems["displayLabel"]).toContain(
				"invisible or bidirectional",
			)
		}
	})

	test("clears a stored Flow's label when the field is emptied", () => {
		const rent = planDocument().flows.find((flow) => flow.id === "rent")
		if (rent === undefined) throw new Error("the fixture has a rent Flow")
		const stored = { ...rent, displayLabel: "Rent" }
		const result = flowFromDraft(
			{ ...flowDraftOf(stored), displayLabel: "" },
			{
				kind: "expense",
				existing: stored,
				taken: [],
			},
		)
		expect(result.ok && result.flow).not.toHaveProperty("displayLabel")
	})

	test("takes its id from its name, its amount without commas, and a fixed percent in basis points", () => {
		const result = flowFromDraft(
			{ ...blank, name: "Bonus 2027", amount: "1,000", growth: "fixed", rate: "3.5" },
			{ kind: "income", taken: ["salary"] },
		)
		expect(result).toEqual({
			ok: true,
			flow: {
				id: "bonus-2027",
				kind: "income",
				frequency: "monthly",
				start: "2027-01-01",
				amount: "1000",
				growth: { bps: 350 },
				earned: true,
			},
		})
	})

	test("numbers its id when another Flow already holds the name, and keeps passive income passive", () => {
		const result = flowFromDraft(
			{ ...blank, name: "salary", earned: false, end: "2028-12-31" },
			{ kind: "income", taken: ["salary"] },
		)
		expect(result.ok && result.flow.id).toBe("salary-2")
		expect(result.ok && result.flow.earned).toBe(false)
		expect(result.ok && result.flow.end).toBe("2028-12-31")
	})

	test("an expense has no earned field, and an empty end is left out", () => {
		const result = flowFromDraft({ ...blank, name: "Gym" }, { kind: "expense", taken: [] })
		expect(result.ok).toBe(true)
		expect(result.ok && "earned" in result.flow).toBe(false)
		expect(result.ok && "end" in result.flow).toBe(false)
	})

	test("refuses a missing name, an amount that is not a number, a bad date and a rate with three places", () => {
		const result = flowFromDraft(
			{ ...blank, name: " ", amount: "abc", start: "1 Jan", growth: "fixed", rate: "3.005" },
			{ kind: "income", taken: [] },
		)
		expect(result.ok).toBe(false)
		if (result.ok) return
		expect(Object.keys(result.problems).sort()).toEqual(["amount", "name", "rate", "start"])
		expect(result.problems["rate"]).toContain("two places")
	})

	test("a once Flow keeps no end the CLI would refuse, and keeps one that repeats its start", () => {
		// `traj` refuses a once Flow whose end differs from its start (ONCE_FLOW_END_MISMATCH).
		const stale = flowFromDraft(
			{ ...blank, name: "Trip", frequency: "once", start: "2027-01-01", end: "2030-01-01" },
			{ kind: "expense", taken: [] },
		)
		expect(stale.ok && "end" in stale.flow).toBe(false)
		const same = flowFromDraft(
			{ ...blank, name: "Trip", frequency: "once", start: "2027-01-01", end: "2027-01-01" },
			{ kind: "expense", taken: [] },
		)
		expect(same.ok && same.flow.end).toBe("2027-01-01")
	})

	test("an existing Flow's id is never renamed by the form, even when its name field is blank", () => {
		const salary = planDocument().flows[0]
		const result = flowFromDraft(
			{ ...blank, name: "" },
			{ kind: "income", existing: salary, taken: [] },
		)
		expect(result.ok && result.flow.id).toBe("salary")
	})
})

describe("flowDraftOf", () => {
	test("starts a new Flow monthly, following inflation and earned", () => {
		expect(flowDraftOf()).toEqual({
			category: "",
			displayLabel: "",
			name: "",
			frequency: "monthly",
			start: "",
			end: "",
			amount: "",
			growth: "inflation",
			rate: "",
			earned: true,
		})
	})

	test("shows an existing Flow's rate as a percent, moved from its basis points", () => {
		const rent = planDocument().flows.find((flow) => flow.id === "rent")
		expect(flowDraftOf(rent)).toMatchObject({ growth: "fixed", rate: "3.00", amount: "14000.00" })
	})
})
