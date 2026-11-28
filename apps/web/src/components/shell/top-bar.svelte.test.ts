import { afterAll, describe, expect, test } from "bun:test"
import { render } from "svelte/server"
import { shellPanels } from "../../client/shell.svelte.js"
import ShellTopBar from "./ShellTopBar.svelte"

const noop = () => {}
const topBar = () =>
	render(ShellTopBar, { props: { names: ["base"], selected: "base", onPlan: noop } })

afterAll(() => {
	shellPanels.closeMenu()
})

describe("ShellTopBar", () => {
	test("holds only the menu button and the plan switcher", () => {
		const { body } = topBar()
		expect(body).toContain('aria-controls="page-menu"')
		expect(body).toContain('aria-label="Open the menu"')
		expect(body).toContain('aria-label="Plan: base. Change plan"')
		for (const gone of [
			'aria-label="Hide amounts"',
			'aria-label="Display options"',
			"Figures as of",
			"31 Oct 2026",
		]) {
			expect(body, gone).not.toContain(gone)
		}
		expect(body).not.toContain(">Net worth<")
	})

	test("says on the menu button whether the drawer is open", () => {
		shellPanels.closeMenu()
		expect(topBar().body).toContain('aria-expanded="false"')
		shellPanels.openMenu()
		expect(topBar().body).toContain('aria-expanded="true"')
		shellPanels.closeMenu()
	})
})
