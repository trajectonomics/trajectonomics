import AxeBuilder from "@axe-core/playwright"
import { expect, type Page, test } from "@playwright/test"
import { FI_DEMO_OUTPUT } from "../src/lib/site"
import { DEVICE_SCHEMES, expectShippedTheme, homeOf, openPage, PAGES_UNDER_TEST } from "./pages"
import { VIEWPORTS } from "./viewports"

/** Every WCAG 2.2 AA tag the Site promises. */
const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"] as const

/** What every analysis asks axe for: the Site's tags, plus `target-size`, which axe ships disabled. */
function axeOptions() {
	return {
		runOnly: { type: "tag" as const, values: [...TAGS] },
		rules: { "target-size": { enabled: true } },
	}
}

/** Fail on every axe violation the page has, and on every rule axe could not judge. */
async function expectAxeReportsNothing(page: Page, path: string): Promise<void> {
	// The cookie card is fixed to the screen's corner, so each line of its question lies over different page content,
	// and axe cannot judge fixed text whose lines sit over different stacks. Its background is opaque, so its contrast
	// does not depend on what is under it: the card is laid into the page's flow, where axe judges the same pixels
	// ([ADR 0028](../docs/adr/0028-the-cookie-card-sits-in-the-corner-and-each-small-feature-has-its-robot.md)).
	await page.addStyleTag({ content: ".consent { position: static; }" })
	// One options call: a later options() replaces the whole object, tags included.
	// The live Demo is the real Dashboard in an iframe, a second document with its own labels and
	// controls (ADR 0034). Its chart text sits over drawn shapes axe cannot judge, and the frame's own
	// document is the Dashboard's to keep accessible: this scan judges the Site's document, so the
	// section's heading, zoom controls and way out are still held to every rule.
	const results = await new AxeBuilder({ page })
		.options(axeOptions())
		.exclude("[data-live-frame]")
		.analyze()
	const violations = results.violations.map(
		(violation) => `${violation.id} (${violation.impact}): ${violation.help}`,
	)
	expect(violations, `${path} passes every axe rule`).toEqual([])
	// An incomplete is axe saying it could not decide, which is how the demo output's contrast
	// finding passed for months. Naming the rule and its nodes keeps the next one actionable
	// ([ADR 0021](../docs/adr/0021-the-browser-checks-judge-a-phone-and-the-demo-output-wraps.md)).
	const unjudged = results.incomplete.map(
		(rule) => `${rule.id}: ${rule.nodes.map((node) => node.target.join(" ")).join(", ")}`,
	)
	expect(unjudged, `${path} leaves axe no rule it cannot judge`).toEqual([])
}

for (const [viewportName, viewport] of Object.entries(VIEWPORTS)) {
	for (const scheme of DEVICE_SCHEMES) {
		test.describe(`axe at the ${viewportName} viewport of a ${scheme} device`, () => {
			test.use({
				colorScheme: scheme,
				// Reduced motion settles the load-in animation at once, so axe judges the shipped pixels
				// instead of a mid-animation frame whose opacity lowers the computed contrast. It also
				// lays both demo chats out whole, where motion allowed shows one at a time: the chat with
				// the skill, which carries the demo output, is in the judged tree only here
				// ([ADR 0022](../docs/adr/0022-the-hero-carries-one-app-window-and-the-page-loses-how-it-works.md)).
				reducedMotion: "reduce",
				viewport,
			})

			for (const underTest of PAGES_UNDER_TEST) {
				test(`${underTest.name} has no axe violation and nothing axe cannot judge`, async ({
					page,
				}) => {
					await openPage(page, underTest)
					await expectShippedTheme(page)
					await expectAxeReportsNothing(page, underTest.path)
				})
			}
		})
	}
}

for (const [viewportName, viewport] of Object.entries(VIEWPORTS)) {
	test.describe(`axe on the demo window in its interactive state at the ${viewportName} viewport`, () => {
		// Motion allowed, so the script runs: the sidebar is in the reading order, its controls are
		// enabled and each transcript is a scroll region that must be a Tab stop. A click on a chat in the
		// sidebar settles it, so axe judges the shipped pixels and not a frame of the sequence.
		test.use({ colorScheme: "light", reducedMotion: "no-preference", viewport })

		test("has no axe violation, and nothing axe cannot judge", async ({ page }) => {
			await openPage(page, homeOf("en"))
			await page.locator('[data-app-chat="with"]').click()
			await page.locator('[data-app-chat="without"]').click()
			await expect(page.locator('.app-chat[data-chat="without"]')).not.toHaveAttribute(
				"data-motion",
				/.+/,
			)
			await expect(page.locator("[data-app-side]")).not.toHaveAttribute("aria-hidden", /.+/)
			// The load-in animation has settled, so no frame of it lowers a computed contrast.
			await page.waitForTimeout(1_500)
			await expectAxeReportsNothing(page, "the English home with the demo window interactive")
		})
	})
}

test.describe("the demo output at the phone viewport", () => {
	// The same setting the axe loop uses above, and for the same reason.
	test.use({ reducedMotion: "reduce" })

	test("shows its whole answer without scrolling", async ({ page }) => {
		// The viewport is set here rather than looped over, so the check holds on its own. It is stricter
		// than axe's `scrollable-region-focusable`, which passes a scrollable region that is keyboard
		// focusable: this asks that there be nothing to scroll, and names the element and both widths.
		await page.setViewportSize(VIEWPORTS.phone)
		await openPage(page, homeOf("en"))
		const output = page.locator("pre.terminal-output")
		const measured = await output.evaluate((element) => ({
			clientWidth: element.clientWidth,
			lines: [...element.querySelectorAll(".terminal-line")].map((line) => line.textContent ?? ""),
			scrollWidth: element.scrollWidth,
		}))
		expect(
			measured.clientWidth,
			"pre.terminal-output sits on a panel the phone lays out",
		).toBeGreaterThan(0)
		expect(measured.lines, "pre.terminal-output prints the whole fixture").toEqual([
			...FI_DEMO_OUTPUT,
		])
		expect(
			measured.scrollWidth,
			`pre.terminal-output scrolls to ${measured.scrollWidth} px inside ${measured.clientWidth} px`,
		).toBe(measured.clientWidth)
	})
})

test("a fixture outside the build with an unnamed button fails axe", async ({ page }) => {
	const fixture =
		'<html lang="en"><body><main><h1>Fixture</h1><button></button></main></body></html>'
	await page.setContent(fixture)
	const results = await new AxeBuilder({ page }).options(axeOptions()).analyze()
	expect(results.violations.map((violation) => violation.id)).toContain("button-name")
})
