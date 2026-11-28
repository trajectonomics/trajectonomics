import { afterEach, describe, expect, test } from "bun:test"
import { createRawSnippet } from "svelte"
import { render } from "svelte/server"
import { preferences } from "../../client/preferences.svelte.js"
import Card from "./Card.svelte"

const children = createRawSnippet(() => ({ render: () => "<p>Figure</p>" }))
const details = createRawSnippet(() => ({ render: () => "<p>Hash abc</p>" }))
const argv = ["net-worth", "--json"]

describe("Card footer", () => {
	// The suite runs with --no-isolate, so a leaked switch would hide failures in other files.
	afterEach(() => {
		preferences.showCommands = false
	})

	test("with the traj commands off and no details, draws no footer", () => {
		const { body } = render(Card, { props: { title: "Net worth", argv, children } })
		expect(body).not.toContain("<footer")
		expect(body).not.toContain("traj net-worth")
	})

	test("with the traj commands off, keeps the footer for the details", () => {
		const { body } = render(Card, { props: { title: "Net worth", argv, details, children } })
		expect(body).toContain("<footer")
		expect(body).toContain("Hash abc")
		expect(body).not.toContain("traj net-worth")
	})

	test("with the traj commands on, shows the command in the footer", () => {
		preferences.showCommands = true
		const { body } = render(Card, { props: { title: "Net worth", argv, children } })
		expect(body).toContain("<footer")
		expect(body).toContain("traj net-worth --json")
	})
})
