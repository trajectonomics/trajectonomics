import { afterEach, describe, expect, test } from "bun:test"
import { render } from "svelte/server"
import { editSession, STALE_PLAN } from "../../client/edit.svelte.js"
import { WRITTEN_REREAD_FAILED, WRITTEN_REREAD_FAILED_MESSAGE } from "../../lib/edit/failure"
import WhatIfActions from "./WhatIfActions.svelte"

afterEach(() => {
	editSession.stale = false
	editSession.failure = null
	editSession.error = null
})

describe("the What-if bar's actions after a save", () => {
	test("say the change was saved but could not be read again, with a Reload button", () => {
		editSession.failure = {
			code: WRITTEN_REREAD_FAILED,
			exitCode: 1,
			message: WRITTEN_REREAD_FAILED_MESSAGE,
		}
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
})
