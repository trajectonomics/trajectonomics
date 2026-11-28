import { expect, type Page, test } from "@playwright/test"
import { openDemo } from "./demo"
import { PAGES, pageName } from "./pages"

// The traj commands under every Details are a Display setting, off by default (#937). A page opens with
// no command block at all, and the two pages that state one show it once the switch is on.
const WIDTH_PX = 1280
const HEIGHT_PX = 800

/** The text of every command block on the page: a `pre code` whose text starts with `traj `. */
function commands(page: Page): Promise<string[]> {
	return page
		.locator("pre code")
		.evaluateAll((codes) =>
			codes
				.map((code) => (code.textContent ?? "").trim())
				.filter((text) => text.startsWith("traj ")),
		)
}

for (const path of PAGES) {
	test(`${pageName(path)} hides the traj commands with the switch off`, async ({ page }) => {
		await page.setViewportSize({ width: WIDTH_PX, height: HEIGHT_PX })
		await openDemo(page, path, { theme: "light" })
		expect(await commands(page), "command blocks with the switch off").toEqual([])
	})
}

for (const path of ["/projection/years/", "/net-worth/"]) {
	test(`${pageName(path)} shows the traj commands with the switch on`, async ({ page }) => {
		await page.setViewportSize({ width: WIDTH_PX, height: HEIGHT_PX })
		await page.addInitScript(() => localStorage.setItem("traj.showCommands", "1"))
		await openDemo(page, path, { theme: "light" })
		expect((await commands(page)).length, "command blocks with the switch on").toBeGreaterThan(0)
	})
}
