import AxeBuilder from "@axe-core/playwright"
import { expect, type Page, test } from "@playwright/test"
import { DEVICE_SCHEMES, expectShippedTheme, openPage, PAGES_UNDER_TEST } from "./pages"
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
	// The hero's window is the real Dashboard in an iframe, a second document with its own labels and
	// controls (ADR 0035). Its chart text sits over drawn shapes axe cannot judge, and the frame's own
	// document is the Dashboard's to keep accessible: this scan judges the Site's document, so the
	// window's bar, zoom controls and way out are still held to every rule.
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
				// instead of a mid-animation frame whose opacity lowers the computed contrast
				// ([ADR 0019](../docs/adr/0019-the-sections-motion-plays-once-on-entry.md)).
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

test("a fixture outside the build with an unnamed button fails axe", async ({ page }) => {
	const fixture =
		'<html lang="en"><body><main><h1>Fixture</h1><button></button></main></body></html>'
	await page.setContent(fixture)
	const results = await new AxeBuilder({ page }).options(axeOptions()).analyze()
	expect(results.violations.map((violation) => violation.id)).toContain("button-name")
})
