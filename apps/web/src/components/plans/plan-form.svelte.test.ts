import { afterEach, describe, expect, test } from "bun:test"
import { createRawSnippet } from "svelte"
import { render } from "svelte/server"
import { editSession } from "../../client/edit.svelte.js"
import PlanForm from "./PlanForm.svelte"

const children = createRawSnippet(() => ({ render: () => "<p>field</p>" }))

afterEach(() => editSession.clear())

describe("a plan form's problem", () => {
	const body = () =>
		render(PlanForm, {
			props: {
				submit: "Rename",
				problem: null,
				onSubmit: () => {},
				onCancel: () => {},
				children,
			},
		}).body

	test("marks the CLI's own refusal as the CLI's text", () => {
		editSession.failure = {
			code: "invalid_input",
			exitCode: 2,
			message: "The CLI refused the Edit.",
		}
		editSession.error = "The CLI refused the Edit."
		expect(body()).toContain("data-cli")
	})

	test("shows the server's own refusal as the page's words", () => {
		editSession.failure = {
			code: "scenario_name_taken",
			exitCode: 1,
			message: "A plan named base already exists.",
		}
		editSession.error = "A plan named base already exists."
		const html = body()
		expect(html).toContain("A plan named base already exists.")
		expect(html).not.toContain("data-cli")
	})
})
