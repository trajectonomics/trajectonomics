import { afterEach, describe, expect, test } from "bun:test"
import { render } from "svelte/server"
import { editSession, STALE_PLAN } from "../../client/edit.svelte.js"
import { WRITTEN_REREAD_FAILED_MESSAGE } from "../../lib/edit/failure"
import WhatIfActions from "./WhatIfActions.svelte"

afterEach(() => {
	editSession.token = null
	editSession.stale = false
	editSession.savedUnread = false
	editSession.failure = null
	editSession.error = null
})

describe("the What-if bar's actions after a save", () => {
	test("do not repeat the page's sentence when a write landed while its read failed", () => {
		editSession.savedUnread = true
		const { body } = render(WhatIfActions)
		expect(body).not.toContain(WRITTEN_REREAD_FAILED_MESSAGE)
		expect(body).not.toContain('role="alert"')
	})

	test("still say the plan changed when a save was refused over a changed plan", () => {
		editSession.stale = true
		const { body } = render(WhatIfActions)
		expect(body).toContain(STALE_PLAN)
		expect(body).not.toContain(WRITTEN_REREAD_FAILED_MESSAGE)
	})
})
