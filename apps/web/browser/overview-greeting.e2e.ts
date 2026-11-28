import { expect, type Page, test } from "@playwright/test"
import { openDemo } from "./demo"

/** The holder name the 360px case uses: 80 characters with no space to break at. */
const LONG_HOLDER = "W".repeat(80)

interface DemoSnapshot {
	reads: {
		scenarios: { data: { scenarios: { name: string; main: boolean }[] } }
		documents: Record<
			string,
			{
				data: {
					scenario: {
						household: { people: { role: string; displayLabel?: string }[] }
					}
				}
			}
		>
	}
}

/** Serves the Demo snapshot with `base` as the main plan and its holder named `label`. */
async function serveHolder(page: Page, label: string): Promise<void> {
	await page.route("**/demo/snapshot.json", async (route) => {
		const response = await route.fetch()
		const snapshot = (await response.json()) as DemoSnapshot
		const base = snapshot.reads.scenarios.data.scenarios.find((plan) => plan.name === "base")
		if (base === undefined) throw new Error("the Demo has base")
		base.main = true
		const holder = snapshot.reads.documents["base"]?.data.scenario.household.people.find(
			(person) => person.role === "holder",
		)
		if (holder === undefined) throw new Error("the Demo's base has a holder")
		holder.displayLabel = label
		await route.fulfill({ response, json: snapshot })
	})
}

// Home greets the reader with the household's holder and the Site's hello robot beside the title
// (#928). The robot is decoration: it is small at both widths and gone from paper.
test("greets Home with the mascot beside its title, and keeps it off paper", async ({ page }) => {
	for (const width of [360, 1280]) {
		await page.setViewportSize({ width, height: 800 })
		await openDemo(page, "/", { theme: "light" })
		await expect(page.getByRole("heading", { level: 1 })).toHaveText(
			"Hello there, this is your current situation",
		)
		const mascot = page.locator("[data-overview-mascot]")
		await expect(mascot).toBeVisible()
		const naturalWidth = await mascot.evaluate((image) => (image as HTMLImageElement).naturalWidth)
		expect(naturalWidth, `the mascot's image loads at ${width}px`).toBeGreaterThan(0)
		const box = await mascot.boundingBox()
		expect(Math.round(box?.width ?? 0), `the mascot's width at ${width}px`).toBe(60)
		expect(Math.round(box?.height ?? 0), `the mascot's height at ${width}px`).toBe(40)
	}
	await page.emulateMedia({ media: "print" })
	await expect(page.locator("[data-overview-mascot]")).toBeHidden()
})

// A household can name its holder in one word longer than a phone screen (#928): the greeting wraps
// inside the title instead of widening the page.
test("keeps an 80-character holder name on a 360px screen", async ({ page }) => {
	await page.setViewportSize({ width: 360, height: 800 })
	await serveHolder(page, LONG_HOLDER)
	await openDemo(page, "/", { theme: "light" })
	await expect(page.getByRole("heading", { level: 1 })).toHaveText(
		`Hello ${LONG_HOLDER}, this is your current situation`,
	)
	expect(
		await page.evaluate(() => document.documentElement.scrollWidth),
		"the page does not scroll sideways",
	).toBeLessThanOrEqual(360)
})
