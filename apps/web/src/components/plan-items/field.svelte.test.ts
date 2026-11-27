import { describe, expect, test } from "bun:test"
import { render } from "svelte/server"
import { preferences } from "../../client/preferences.svelte.js"
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

describe("a field's description", () => {
	test("names both its hint and its problem, so neither is lost", () => {
		const body = render(Field, {
			props: {
				id: "amount",
				label: "Amount",
				value: "9000.50",
				hint: "A decimal number",
				problem: "Too many decimal places.",
			},
		}).body
		expect(body).toContain('aria-describedby="amount-hint amount-problem"')
	})
})

describe("Hide amounts at a money field", () => {
	test("shows the mask while the field is not focused, and says how to edit it", () => {
		preferences.hidden = true
		try {
			const body = render(Field, {
				props: { id: "amount", label: "Amount", value: "9000.50", money: true },
			}).body
			expect(body).toContain("•••••")
			expect(body).not.toContain("9000.50")
			expect(body).toContain('id="amount-masked"')
			expect(body).toContain("Amount hidden. Select the field to see and edit it.")
		} finally {
			preferences.hidden = false
		}
	})

	test("leaves a field that is no money as it is, and an empty one empty", () => {
		preferences.hidden = true
		try {
			expect(
				render(Field, {
					props: { id: "rate", label: "Rate", value: "3.50", inputmode: "decimal" },
				}).body,
			).toContain("3.50")
			expect(
				render(Field, { props: { id: "amount", label: "Amount", value: "", money: true } }).body,
			).not.toContain("•••••")
		} finally {
			preferences.hidden = false
		}
	})
})
