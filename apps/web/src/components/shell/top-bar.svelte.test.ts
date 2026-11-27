import { afterAll, beforeEach, describe, expect, test } from "bun:test"
import { render } from "svelte/server"
import { snapshotLoader } from "../../client/browser"
import { preferences } from "../../client/preferences.svelte.js"
import { replaceSnapshot } from "../../client/snapshot.svelte"
import type { Snapshot } from "../../lib/contract"
import { LOADING } from "../../lib/view/state"
import DisplayOptions from "./DisplayOptions.svelte"
import ShellTopBar from "./ShellTopBar.svelte"

const SNAPSHOT = {
	cliVersion: "0.0.0",
	params: { asOf: "2026-10-31" },
} as Snapshot

// The Snapshot store and the preferences are shared by every test file in the process, so they are put back.
afterAll(() => {
	snapshotLoader.replace(LOADING)
	preferences.hidden = false
})

beforeEach(() => {
	replaceSnapshot(SNAPSHOT)
	preferences.hidden = false
})

describe("ShellTopBar", () => {
	test("keeps the page title out of the bar, with icon-only actions and the As-of date", () => {
		const { body } = render(ShellTopBar, {})
		expect(body).not.toContain(">Net worth<")
		expect(body).toContain('aria-label="Display options"')
		expect(body).toContain('title="Display options"')
		expect(body).toContain('aria-label="Hide amounts"')
		expect(body).toContain('aria-pressed="false"')
		expect(body).toContain("31 Oct 2026")
		expect(body).toContain('title="Figures as of 31 Oct 2026"')
		expect(body).toContain("hidden h-[34px]")
		expect(body).toContain("sm:inline-flex")
		expect(body).not.toContain("traj 0.0.0")
	})

	test("shows the closed eye and the pressed state while amounts are hidden", () => {
		preferences.hidden = true
		const { body } = render(ShellTopBar, {})
		expect(body).toContain('aria-pressed="true"')
		expect(body).toContain("m2 2 20 20")
	})
})

describe("DisplayOptions", () => {
	test("moves the CLI version into the drawer's muted footer", () => {
		const { body } = render(DisplayOptions, {})
		expect(body).toContain("Read by traj 0.0.0")
		expect(body).toContain("mt-auto text-xs text-muted-foreground")
	})
})
