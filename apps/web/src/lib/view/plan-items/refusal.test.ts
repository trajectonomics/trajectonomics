import { describe, expect, test } from "bun:test"
import type { ErrorBody } from "../../contract"
import { shownProblems } from "./problems"
import { fieldOfRefusal } from "./refusal"

const FLOW_FIELDS = ["name", "amount", "rate", "start"]

function refusal(path: string | undefined): ErrorBody {
	const base = { code: "INVALID_AMOUNT", exitCode: 3, message: "The amount has too many places." }
	return path === undefined ? base : { ...base, path }
}

describe("fieldOfRefusal: the whole path of the item the form edits", () => {
	const SALARY = "flows.salary"

	test("names the field under that item, and no field for another item with the same last segment", () => {
		expect(fieldOfRefusal(refusal("document.flows.salary.amount"), FLOW_FIELDS, SALARY)).toBe(
			"amount",
		)
		expect(fieldOfRefusal(refusal("document.flows.salary.start"), FLOW_FIELDS, SALARY)).toBe(
			"start",
		)
		expect(fieldOfRefusal(refusal("document.flows.bonus.amount"), FLOW_FIELDS, SALARY)).toBeNull()
		expect(fieldOfRefusal(refusal("document.flows.salary"), FLOW_FIELDS, SALARY)).toBeNull()
	})

	test("names the rate for a path through growth, and no field for an unknown or missing path", () => {
		expect(fieldOfRefusal(refusal("document.flows.salary.growth.bps"), FLOW_FIELDS, SALARY)).toBe(
			"rate",
		)
		expect(fieldOfRefusal(refusal("document.flows.0"), FLOW_FIELDS, SALARY)).toBeNull()
		expect(fieldOfRefusal(refusal(undefined), FLOW_FIELDS, SALARY)).toBeNull()
		expect(fieldOfRefusal(null, FLOW_FIELDS, SALARY)).toBeNull()
	})

	test("reads an Account's payout and fee under that Account, and its prepayments as no field", () => {
		const ACCOUNT = "accounts.fund"
		const FIELDS = ["rate", "payoutRate", "payoutStart", "feeRate"]
		expect(fieldOfRefusal(refusal("document.accounts.fund.payout.bps"), FIELDS, ACCOUNT)).toBe(
			"payoutRate",
		)
		expect(fieldOfRefusal(refusal("document.accounts.fund.payout.start"), FIELDS, ACCOUNT)).toBe(
			"payoutStart",
		)
		expect(fieldOfRefusal(refusal("document.accounts.fund.fee.bps"), FIELDS, ACCOUNT)).toBe(
			"feeRate",
		)
		expect(
			fieldOfRefusal(refusal("document.accounts.fund.payout.prepayments.0.bps"), FIELDS, ACCOUNT),
		).toBeNull()
		expect(fieldOfRefusal(refusal("document.accounts.other.fee.bps"), FIELDS, ACCOUNT)).toBeNull()
	})

	test("reads a salary's employer Flow under its own path, not the salary's", () => {
		const FIELDS = ["amount", "employerAccount", "employerRounding"]
		const EMPLOYER = "flows.salary-employer"
		expect(
			fieldOfRefusal(
				refusal("document.flows.salary-employer.derive.measures.1.rounding"),
				FIELDS,
				SALARY,
				EMPLOYER,
			),
		).toBe("employerRounding")
		expect(
			fieldOfRefusal(refusal("document.flows.salary-employer.amount"), FIELDS, SALARY, EMPLOYER),
		).toBe("employerAccount")
		expect(
			fieldOfRefusal(
				refusal("document.flows.other-employer.derive.measures.1.rounding"),
				FIELDS,
				SALARY,
				EMPLOYER,
			),
		).toBeNull()
	})
})

describe("fieldOfRefusal: a household item", () => {
	const ANCHOR_FIELDS = ["flow", "edge", "person", "when", "age"]
	const PERSON_FIELDS = ["name", "displayLabel", "role", "born"]

	test("names the age for an anchor refused as a whole, or at its date, and none for another anchor", () => {
		const ANCHOR = "anchors.0"
		expect(fieldOfRefusal(refusal("document.anchors.0.path"), ANCHOR_FIELDS, ANCHOR)).toBe("age")
		expect(fieldOfRefusal(refusal("document.anchors.0"), ANCHOR_FIELDS, ANCHOR)).toBe("age")
		expect(fieldOfRefusal(refusal("document.anchors.1.path"), ANCHOR_FIELDS, ANCHOR)).toBeNull()
		expect(fieldOfRefusal(refusal("document.anchors.0.person"), ANCHOR_FIELDS, ANCHOR)).toBe(
			"person",
		)
		expect(fieldOfRefusal(refusal("document.anchors.0.age"), ANCHOR_FIELDS, ANCHOR)).toBe("age")
		expect(fieldOfRefusal(refusal("document.anchors.0.path"), FLOW_FIELDS, ANCHOR)).toBeNull()
	})

	test("keeps a person's display label on Name, and a refusal at another person off it", () => {
		const PERSON = "people.1"
		expect(fieldOfRefusal(refusal("document.people.1.displayLabel"), PERSON_FIELDS, PERSON)).toBe(
			"displayLabel",
		)
		expect(
			fieldOfRefusal(refusal("document.people.0.displayLabel"), PERSON_FIELDS, PERSON),
		).toBeNull()
	})
})

describe("shownProblems", () => {
	test("shows a refusal at the form's own item at its field, and not on the others", () => {
		const shown = shownProblems(
			{},
			refusal("document.flows.salary.amount"),
			"The amount has too many places.",
			FLOW_FIELDS,
			"flows.salary",
		)
		expect(shown.at("amount")).toBe("The amount has too many places.")
		expect(shown.at("start")).toBeUndefined()
		expect(shown.general).toBeUndefined()
	})

	test("shows a refusal at another item, or one that names no field, for the whole form", () => {
		const other = shownProblems(
			{},
			refusal("document.flows.bonus.amount"),
			"Refused.",
			FLOW_FIELDS,
			"flows.salary",
		)
		expect(other.at("amount")).toBeUndefined()
		expect(other.general).toBe("Refused.")
		const named = shownProblems(
			{},
			refusal("document.flows"),
			"Refused.",
			FLOW_FIELDS,
			"flows.salary",
		)
		expect(named.general).toBe("Refused.")
		const transport = shownProblems(
			{},
			null,
			"The Dashboard could not reach traj.",
			FLOW_FIELDS,
			"flows.salary",
		)
		expect(transport.general).toBe("The Dashboard could not reach traj.")
	})

	test("a form's own problem takes its field, and the refusal does not repeat there", () => {
		const shown = shownProblems(
			{ amount: "Enter an amount." },
			refusal("document.flows.salary.amount"),
			"Refused.",
			FLOW_FIELDS,
			"flows.salary",
		)
		expect(shown.at("amount")).toBe("Enter an amount.")
		expect(shown.general).toBeUndefined()
	})
})

describe("a Flow's tax label is no form field, and its display label is", () => {
	const FIELDS = ["name", "displayLabel", "amount", "rate", "start"]
	const ITEM = "flows.salary"

	test("a refusal at the tax label is the form's problem, so it does not show under Name", () => {
		const shown = shownProblems(
			{},
			refusal("document.flows.salary.label"),
			"No such tax label.",
			FIELDS,
			ITEM,
		)
		expect(shown.at("displayLabel")).toBeUndefined()
		expect(shown.general).toBe("No such tax label.")
	})

	test("a refusal at the display label lands on the Name field", () => {
		const shown = shownProblems(
			{},
			refusal("document.flows.salary.displayLabel"),
			"The rule it broke.",
			FIELDS,
			ITEM,
		)
		expect(shown.at("displayLabel")).toBe("The rule it broke.")
		expect(shown.general).toBeUndefined()
	})
})
