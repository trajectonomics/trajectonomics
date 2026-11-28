import { afterEach, describe, expect, test } from "bun:test"
import { render } from "svelte/server"
import { editSession, STALE_PLAN } from "../../client/edit.svelte.js"
import { WRITTEN_REREAD_FAILED_MESSAGE } from "../../lib/edit/failure"
import StaleNotice from "./StaleNotice.svelte"

afterEach(() => {
	editSession.stale = false
	editSession.savedUnread = false
	editSession.failure = null
	editSession.source = "form"
})

describe("StaleNotice", () => {
	test("says nothing while no save was refused over a changed plan", () => {
		expect(render(StaleNotice).body).not.toContain(STALE_PLAN)
	})

	test("says the plan changed, as an alert with a Reload button, once a save was refused", () => {
		editSession.stale = true
		const { body } = render(StaleNotice)
		expect(body).toContain('role="alert"')
		expect(body).toContain(STALE_PLAN)
		expect(body).toContain(">Reload</button>")
	})

	test("says the change was saved but the page could not show it, with the same Reload button", () => {
		editSession.savedUnread = true
		const { body } = render(StaleNotice)
		expect(body).toContain('role="alert"')
		expect(body).toContain(WRITTEN_REREAD_FAILED_MESSAGE)
		expect(body).not.toContain(STALE_PLAN)
		expect(body).toContain(">Reload</button>")
	})

	test("shows only its own case: a form hides the landed sentence, the page hides the refusal", () => {
		editSession.savedUnread = true
		expect(render(StaleNotice, { props: { shows: "stale" } }).body).not.toContain(
			WRITTEN_REREAD_FAILED_MESSAGE,
		)
		editSession.savedUnread = false
		editSession.stale = true
		const landed = render(StaleNotice, { props: { shows: "landed" } }).body
		expect(landed).not.toContain(STALE_PLAN)
		expect(landed).not.toContain(">Reload</button>")
	})

	test("draws a focus ring on its button and never turns the ring off", () => {
		editSession.stale = true
		const { body } = render(StaleNotice)
		expect(body).toContain("focus-visible:outline-2")
		expect(body).toContain("focus-visible:outline-offset-2")
		expect(body).not.toContain("outline-none")
	})

	test("leaves an inline action's refusal to the copy beside that action", () => {
		editSession.source = "action:main:base"
		editSession.stale = true
		expect(render(StaleNotice).body).not.toContain(STALE_PLAN)
		const beside = (source: string) => render(StaleNotice, { props: { source } }).body
		expect(beside("action:main:base")).toContain(STALE_PLAN)
		expect(beside("action:main:extra")).not.toContain(STALE_PLAN)
	})
})
