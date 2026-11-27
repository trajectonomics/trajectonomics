import AxeBuilder from "@axe-core/playwright"
import { expect, type Page, test } from "@playwright/test"
import { LANGUAGES } from "../src/lib/language"
import { openForReview, type ReviewTarget } from "./open"

/** Every WCAG tag these pages promise. */
const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"] as const

const TARGETS: readonly ReviewTarget[] = [
	"sign-in",
	"welcome",
	"device",
	"consent",
	"account",
	"privacy",
	"terms",
]

const VIEWPORTS = {
	phone: { width: 360, height: 800 },
	desktop: { width: 1280, height: 900 },
} as const

/** Fail on every violation, and on every rule axe could not judge. */
async function expectAxeReportsNothing(page: Page, label: string): Promise<void> {
	const results = await new AxeBuilder({ page })
		.options({
			runOnly: { type: "tag", values: [...TAGS] },
			rules: { "target-size": { enabled: true } },
		})
		.analyze()
	const violations = results.violations.map(
		(violation) => `${violation.id} (${violation.impact}): ${violation.help}`,
	)
	expect(violations, `${label} passes every axe rule`).toEqual([])
	const unjudged = results.incomplete.map(
		(rule) => `${rule.id}: ${rule.nodes.map((node) => node.target.join(" ")).join(", ")}`,
	)
	expect(unjudged, `${label} leaves axe no rule it cannot judge`).toEqual([])
}

for (const [viewportName, viewport] of Object.entries(VIEWPORTS)) {
	for (const scheme of ["light", "dark"] as const) {
		test.describe(`axe at the ${viewportName} viewport of a ${scheme} device`, () => {
			test.use({ colorScheme: scheme, viewport, reducedMotion: "reduce" })

			for (const language of LANGUAGES) {
				for (const target of TARGETS) {
					test(`${language} ${target} has no violation and nothing axe cannot judge`, async ({
						page,
					}) => {
						await openForReview(page, target, language)
						await expect(page.locator("html")).toHaveAttribute("data-theme", scheme)
						await expectAxeReportsNothing(page, `${language} ${target} at ${viewportName}`)
					})
				}
			}
		})
	}
}
