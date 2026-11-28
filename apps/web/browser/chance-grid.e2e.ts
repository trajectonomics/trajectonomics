import { expect, type Page, test } from "@playwright/test"
import { openDemo } from "./demo"

// The Chance focus point draws one square per market path, in a fixed 240px frame (#707, B4): 10,000 paths
// take no more room than 200. The Demo states 200; a case that states more serves the Demo with that count.
interface DemoSnapshot {
	reads: { chance: { base: { data: { paths: number; succeeded: number } } } }
}

async function servePaths(page: Page, paths: number, succeeded: number): Promise<void> {
	await page.route("**/demo/snapshot.json", async (route) => {
		const response = await route.fetch()
		const snapshot = (await response.json()) as DemoSnapshot
		const chance = snapshot.reads.chance.base.data
		chance.paths = paths
		chance.succeeded = succeeded
		await route.fulfill({ response, json: snapshot })
	})
}

const CASES = [
	{ paths: 200, succeeded: 193 },
	{ paths: 10_000, succeeded: 9_650 },
] as const

for (const width of [1280, 360]) {
	for (const { paths, succeeded } of CASES) {
		test(`the Chance focus grid keeps ${paths} paths inside 300px at ${width}px`, async ({
			page,
		}) => {
			await page.setViewportSize({ width, height: 800 })
			await servePaths(page, paths, succeeded)
			await openDemo(page, "/chance/", { theme: "light" })
			const visual = page.locator("[data-focus-visual]")
			const box = await visual.boundingBox()
			expect(box, "the focus visual's box").not.toBeNull()
			expect(box?.height ?? 0, "the focus visual's height").toBeLessThanOrEqual(300)
			const svg = visual.locator("svg")
			expect((await svg.boundingBox())?.height ?? 0, "the grid's height").toBeLessThanOrEqual(300)
			expect(await svg.locator("rect").count(), "one square per path").toBe(paths)
			await expect(page.locator("[data-focus-answer]")).toBeVisible()
		})
	}
}
