import { afterEach, describe, expect, test } from "bun:test"
import { render } from "svelte/server"
import { editSession, STALE_PLAN } from "../../client/edit.svelte.js"
import { whatIfSession } from "../../client/what-if.svelte.js"
import { WRITTEN_REREAD_FAILED, WRITTEN_REREAD_FAILED_MESSAGE } from "../../lib/edit/failure"
import WhatIfActions from "./WhatIfActions.svelte"

const realFetch = globalThis.fetch
const SAVED_UNREAD = {
	code: WRITTEN_REREAD_FAILED,
	exitCode: 1,
	message: WRITTEN_REREAD_FAILED_MESSAGE,
}

afterEach(() => {
	editSession.token = null
	editSession.stale = false
	editSession.failure = null
	editSession.error = null
	globalThis.fetch = realFetch
})

describe("the What-if bar's actions after a save", () => {
	test("say the change was saved but could not be read again, with a Reload button", () => {
		editSession.failure = SAVED_UNREAD
		const { body } = render(WhatIfActions)
		expect(body).toContain('role="alert"')
		expect(body).toContain(WRITTEN_REREAD_FAILED_MESSAGE)
		expect(body).not.toContain(STALE_PLAN)
		expect(body).toContain(">Reload</button>")
	})

	test("still say the plan changed when a save was refused over a changed plan", () => {
		editSession.stale = true
		const { body } = render(WhatIfActions)
		expect(body).toContain(STALE_PLAN)
		expect(body).not.toContain(WRITTEN_REREAD_FAILED_MESSAGE)
	})

	test("keep the sentence and Reload when Reload's own read fails, so it can be tried again", async () => {
		editSession.token = "token"
		editSession.failure = SAVED_UNREAD
		globalThis.fetch = (async () => {
			throw new Error("the reads still fail")
		}) as unknown as typeof fetch
		await whatIfSession.reload()
		expect(editSession.savedUnread).toBe(true)
		const { body } = render(WhatIfActions)
		expect(body).toContain(WRITTEN_REREAD_FAILED_MESSAGE)
		expect(body).toContain(">Reload</button>")
	})
})
