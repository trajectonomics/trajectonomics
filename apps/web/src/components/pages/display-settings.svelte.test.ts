import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { render } from "svelte/server"
import { preferences } from "../../client/preferences.svelte.js"
import { HIDE_AMOUNTS_ENABLED, type Theme } from "../../lib/view/preferences"
import DisplaySettingsPage from "./DisplaySettingsPage.svelte"

let saved: Theme

beforeEach(() => {
	saved = preferences.theme
})

afterEach(() => {
	preferences.theme = saved
})

describe("the Display settings page", () => {
	test("heads the page Display and offers the Theme switch", () => {
		preferences.theme = "light"
		const { body } = render(DisplaySettingsPage, {})
		expect(body).toContain('<h1 id="page-title"')
		expect(body).toContain(">Display</h1>")
		expect(body).toContain("Dark theme")
		expect(body).toContain('aria-pressed="false"')
	})

	test("says the Theme switch is on when the Theme is dark", () => {
		preferences.theme = "dark"
		const { body } = render(DisplaySettingsPage, {})
		expect(body).toMatch(/<button[^>]*aria-pressed="true"[^>]*>\s*Dark theme/)
	})

	test("offers no Hide amounts switch while the feature is off (#927)", () => {
		expect(HIDE_AMOUNTS_ENABLED).toBe(false)
		expect(render(DisplaySettingsPage, {}).body).not.toContain("Hide amounts")
	})
})
