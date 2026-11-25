import { describe, expect, test } from "bun:test"
import { render } from "svelte/server"
import { LOAN_COMPOUNDING_CHOICES } from "../../lib/view/plan-items/options"
import Field from "./Field.svelte"

/** The body of a select rendered with `value`, which may be a word the choices do not list. */
const bodyOf = (value: string): string =>
	render(Field, {
		props: {
			id: "loan-compounding",
			label: "Interest is added",
			value,
			options: LOAN_COMPOUNDING_CHOICES,
		},
	}).body

describe("a select of the form", () => {
	test("keeps a word it does not offer as an extra option, so it opens on that word rather than empty", () => {
		expect(bodyOf("fortnightly")).toContain(
			'<option value="fortnightly" selected="">fortnightly</option>',
		)
	})

	test("offers only the choices when the value is one of them", () => {
		const body = bodyOf("monthly")
		expect(body).not.toContain("fortnightly")
		expect(body).toContain(
			'<option value="monthly" selected="">Monthly: a payment each month</option>',
		)
	})
})
