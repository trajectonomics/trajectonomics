import { describe, expect, test } from "bun:test"
import type { ScenarioDocument } from "../../contract"
import { INCOME_LABELS, LABEL_CHOICES } from "./label-choices"
import { labelEdit, labelShown, withFlowLabel } from "./label-edit"

const HASH = `jcs1:sha256:${"0123456789abcdef".repeat(4)}`
const flow = (id: string, kind: "income" | "expense") => ({
	id,
	kind,
	frequency: "monthly" as const,
	start: "2026-01-01",
})
const document = {
	currency: "THB",
	accounts: [],
	flows: [flow("salary", "income"), flow("rent", "expense")],
} as unknown as ScenarioDocument
const target = { name: "base", contentHash: HASH, plan: document }

describe("the tax label form", () => {
	test("offers only the labels the CLI accepts for an income Flow, none chosen first", () => {
		expect(LABEL_CHOICES[0]).toEqual({ value: "", label: "Choose a tax label" })
		expect(LABEL_CHOICES.slice(1)).toEqual([...INCOME_LABELS])
		expect(INCOME_LABELS.every((choice) => choice.value.startsWith("income."))).toBe(true)
		expect(new Set(INCOME_LABELS.map((choice) => choice.value)).size).toBe(INCOME_LABELS.length)
		expect(INCOME_LABELS).toHaveLength(22)
	})

	test("sets the label of that one Flow in an apply-plan Edit that names the hash the page read", () => {
		const result = labelEdit(target, { flow: "salary", label: "income.section40_1" })
		if (!result.ok) throw new Error("the draft makes an Edit")
		expect(result.edit).toMatchObject({ kind: "apply-plan", name: "base", contentHash: HASH })
		const sent = (result.edit as unknown as { document: ScenarioDocument }).document
		expect(sent.flows.find((one) => one.id === "salary")?.label).toBe("income.section40_1")
		expect(sent.flows.find((one) => one.id === "rent")).toEqual(flow("rent", "expense"))
		expect(document.flows[0]).toEqual(flow("salary", "income"))
		expect(withFlowLabel(document, "rent", "x").flows[0]).toEqual(flow("salary", "income"))
	})

	test("asks for a Flow and a label, and refuses a Flow that is not income or a label outside the list", () => {
		const bare = labelEdit(target, { flow: "", label: "" })
		expect(bare).toEqual({
			ok: false,
			problems: { flow: "Choose an income Flow.", label: "Choose a tax label." },
		})
		expect(labelEdit(target, { flow: "rent", label: "income.section40_1" }).ok).toBe(false)
		expect(labelEdit(target, { flow: "salary", label: "allowance.retirement.rmf" }).ok).toBe(false)
	})

	test("a refusal whose path names the Flow lands on the label field, any other on the form", () => {
		const refusal = (path: string) => ({
			code: "invalid_input",
			exitCode: 2,
			message: "the CLI's words",
			path,
		})
		const flows = ["salary", "bonus", "side-gig"]
		const at = labelShown(
			{},
			refusal("document.flows.salary.label"),
			"the CLI's words",
			{
				flow: "salary",
				sent: "salary",
			},
			flows,
		)
		expect(at.at("label")).toBe("the CLI's words")
		expect(at.general).toBeUndefined()
		const other = labelShown(
			{},
			refusal("document.flows.bonus.label"),
			"the CLI's words",
			{
				flow: "salary",
				sent: "salary",
			},
			flows,
		)
		expect(other.at("label")).toBeUndefined()
		expect(other.general).toBe("the CLI's words")
		const positional = labelShown(
			{},
			refusal("document.flows.2.label"),
			"the CLI's words",
			{
				flow: "side-gig",
				sent: "side-gig",
			},
			flows,
		)
		expect(positional.at("label")).toBe("the CLI's words")
		expect(
			labelShown(
				{},
				refusal("document"),
				"the CLI's words",
				{ flow: "salary", sent: "salary" },
				flows,
			).general,
		).toBe("the CLI's words")
		expect(
			labelShown({ label: "own" }, null, null, { flow: "salary", sent: "salary" }, flows).at(
				"label",
			),
		).toBe("own")
	})

	test("a refusal stays with the Flow the form sent after the select moves to another", () => {
		const refusal = {
			code: "invalid_input",
			exitCode: 2,
			message: "the CLI's words",
			path: "document.flows.side-gig.label",
		}
		const moved = labelShown({}, refusal, "the CLI's words", { flow: "bonus", sent: "side-gig" }, [
			"salary",
			"bonus",
			"side-gig",
		])
		expect(moved.at("label")).toBe("the CLI's words")
		expect(moved.general).toBeUndefined()
	})
})
