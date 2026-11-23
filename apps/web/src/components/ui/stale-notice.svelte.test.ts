import { afterEach, describe, expect, test } from "bun:test"
import { render } from "svelte/server"
import { editSession, STALE_PLAN } from "../../client/edit.svelte.js"
import StaleNotice from "./StaleNotice.svelte"

afterEach(() => {
	editSession.stale = false
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
})
