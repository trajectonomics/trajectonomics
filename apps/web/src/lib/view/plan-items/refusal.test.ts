import { describe, expect, test } from "bun:test"
import type { ErrorBody } from "../../contract"
import { shownProblems } from "./problems"
import { fieldOfRefusal } from "./refusal"

const FLOW_FIELDS = ["name", "amount", "rate", "start"]

function refusal(path: string | undefined): ErrorBody {
	const base = { code: "INVALID_AMOUNT", exitCode: 3, message: "The amount has too many places." }
	return path === undefined ? base : { ...base, path }
}

describe("fieldOfRefusal", () => {
	test("names the field a refusal's path ends in", () => {
		expect(fieldOfRefusal(refusal("document.flows.salary.amount"), FLOW_FIELDS)).toBe("amount")
		expect(fieldOfRefusal(refusal("document.flows.salary.start"), FLOW_FIELDS)).toBe("start")
	})

	test("names the rate for a path through growth, and no field for an unknown or missing path", () => {
		expect(fieldOfRefusal(refusal("document.flows.salary.growth.bps"), FLOW_FIELDS)).toBe("rate")
		expect(fieldOfRefusal(refusal("document.flows.0"), FLOW_FIELDS)).toBeNull()
		expect(fieldOfRefusal(refusal(undefined), FLOW_FIELDS)).toBeNull()
		expect(fieldOfRefusal(null, FLOW_FIELDS)).toBeNull()
	})
})

describe("fieldOfRefusal: a household anchor", () => {
	const ANCHOR_FIELDS = ["flow", "edge", "person", "when", "age"]

	test("names the age for an anchor refused as a whole, or at its date", () => {
		expect(fieldOfRefusal(refusal("document.anchors.0.path"), ANCHOR_FIELDS)).toBe("age")
		expect(fieldOfRefusal(refusal("document.anchors.0"), ANCHOR_FIELDS)).toBe("age")
		expect(fieldOfRefusal(refusal("document.anchors.12.path"), ANCHOR_FIELDS)).toBe("age")
	})

	test("still names the field an anchor's path ends in, and none for another form", () => {
		expect(fieldOfRefusal(refusal("document.anchors.0.person"), ANCHOR_FIELDS)).toBe("person")
		expect(fieldOfRefusal(refusal("document.anchors.0.age"), ANCHOR_FIELDS)).toBe("age")
		expect(fieldOfRefusal(refusal("document.anchors.0.path"), FLOW_FIELDS)).toBeNull()
		expect(fieldOfRefusal(refusal("document.people.0"), ANCHOR_FIELDS)).toBeNull()
	})
})

describe("shownProblems", () => {
	test("shows a refusal at the field it names, and not on the others", () => {
		const shown = shownProblems(
			{},
			refusal("document.flows.salary.amount"),
			"The amount has too many places.",
			FLOW_FIELDS,
		)
		expect(shown.at("amount")).toBe("The amount has too many places.")
		expect(shown.at("start")).toBeUndefined()
		expect(shown.general).toBeUndefined()
	})

	test("shows a refusal that names no field, and a transport message, for the whole form", () => {
		const named = shownProblems({}, refusal("document.flows"), "Refused.", FLOW_FIELDS)
		expect(named.general).toBe("Refused.")
		const transport = shownProblems({}, null, "The Dashboard could not reach traj.", FLOW_FIELDS)
		expect(transport.general).toBe("The Dashboard could not reach traj.")
	})

	test("a form's own problem takes its field, and the refusal does not repeat there", () => {
		const shown = shownProblems(
			{ amount: "Enter an amount." },
			refusal("document.flows.salary.amount"),
			"Refused.",
			FLOW_FIELDS,
		)
		expect(shown.at("amount")).toBe("Enter an amount.")
		expect(shown.general).toBeUndefined()
	})
})
