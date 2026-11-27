import { afterEach, describe, expect, test } from "bun:test"
import { render } from "svelte/server"
import { editSession, STALE_PLAN } from "../../client/edit.svelte.js"
import { WRITTEN_REREAD_FAILED, WRITTEN_REREAD_FAILED_MESSAGE } from "../../lib/edit/failure"
import StaleNotice from "./StaleNotice.svelte"

/** The error a write that landed answers when the Snapshot read after it failed. */
const SAVED_UNREAD = {
	code: WRITTEN_REREAD_FAILED,
	exitCode: 1,
	message: WRITTEN_REREAD_FAILED_MESSAGE,
}

afterEach(() => {
	editSession.stale = false
	editSession.failure = null
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

	test("says the change was saved but the plan could not be read, with the same Reload button", () => {
		editSession.failure = SAVED_UNREAD
		const { body } = render(StaleNotice)
		expect(body).toContain('role="alert"')
		expect(body).toContain(WRITTEN_REREAD_FAILED_MESSAGE)
		expect(body).not.toContain(STALE_PLAN)
		expect(body).toContain(">Reload</button>")
	})
})
