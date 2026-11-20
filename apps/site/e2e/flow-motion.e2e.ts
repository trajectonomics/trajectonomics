import { expect, type Page, test } from "@playwright/test"
import { dictionaryFor } from "../src/lib/language/languages"
import { expectPulseInLogicLayer, homeOf, openPage } from "./pages"

/** The English home, whose layer flow runs its four steps once (ADR 0019). */
const HOME = homeOf("en")
const dictionary = dictionaryFor(HOME.language)

/** How tall the section is, which is what the growth is measured against. */
function heightOf(page: Page): Promise<number> {
	return page.locator(".how").evaluate((element) => element.getBoundingClientRect().height)
}

test.describe("the layer flow with motion allowed", () => {
	test.use({ reducedMotion: "no-preference" })

	test("grows once to its static height, and marks the stage each step runs in", async ({
		page,
	}) => {
		await openPage(page, HOME)
		const accent = await page.evaluate(() => {
			const probe = document.body.appendChild(document.createElement("span"))
			probe.style.color = "var(--ds-color-accent)"
			const painted = getComputedStyle(probe).color
			probe.remove()
			return painted
		})
		const how = page.locator(".how")
		await how.scrollIntoViewIfNeeded()
		const stages = [
			{ step: "1", stage: ".layer-presentation" },
			{ step: "2", stage: ".layers-join-label" },
			{ step: "3", stage: ".layer-logic" },
			{ step: "4", stage: ".layer-presentation" },
		] as const
		const heights: number[] = []
		for (const { step, stage } of stages) {
			await expect(how).toHaveAttribute("data-step", step, { timeout: 5_000 })
			heights.push(await heightOf(page))
			expect(
				await how.locator(stage).evaluate((element) => getComputedStyle(element).borderTopColor),
				`step ${step} marks ${stage} with the accent`,
			).toBe(accent)
			// The agent doing that step is chipped onto the stage it is working in.
			await expect(how.locator(`[data-step-chip="${step}"]`)).toHaveCSS("opacity", "1")
		}
		await expect(how).not.toHaveAttribute("data-motion", "play", { timeout: 14_000 })
		const settled = await heightOf(page)
		// Monotonic: the section only ever gets taller while it runs, and ends at the static height.
		for (let index = 1; index < heights.length; index++) {
			expect(heights[index], `sample ${index} does not shrink`).toBeGreaterThanOrEqual(
				heights[index - 1] ?? 0,
			)
		}
		expect(heights[0]).toBeLessThan(settled)
		expect(heights[3]).toBe(settled)
	})

	test("fills the three outputs after the flow comes back, and shows the pulse while it runs", async ({
		page,
	}) => {
		await openPage(page, HOME)
		const how = page.locator(".how")
		await how.scrollIntoViewIfNeeded()
		const pulse = page.locator(".layers-pulse")
		// While the request is out computing, the outputs wait empty and the pulse travels the stack.
		await expect(how).toHaveAttribute("data-step", "3", { timeout: 12_000 })
		await expect(how.locator(".how-output-answer > *").first()).toHaveCSS("opacity", "0")
		expect(
			Number(await pulse.evaluate((element) => getComputedStyle(element).opacity)),
		).toBeGreaterThan(0)
		await expectPulseInLogicLayer(page)
		// Come back: the three frames fill in turn, and the static page is the state it ends on.
		await expect(how).not.toHaveAttribute("data-motion", "play", { timeout: 14_000 })
		for (const output of ["answer", "chart", "action"]) {
			await expect(how.locator(`.how-output-${output} > *`).first()).toHaveCSS("opacity", "1")
		}
	})

	test("Replay runs the flow again from its first step", async ({ page }) => {
		await openPage(page, HOME)
		const how = page.locator(".how")
		// The flow's own control: the comparison's one replays the before panel.
		const replay = page.locator(".section-muted [data-replay]")
		await expect(replay).toHaveText(dictionary.replay)
		await replay.click()
		await expect(how).toHaveAttribute("data-motion", "play")
		// The flow marks step 1 on its first tick, one pace after the replay starts.
		await expect(how).toHaveAttribute("data-step", "1", { timeout: 6_000 })
	})
})

test.describe("the layer flow with motion reduced", () => {
	test.use({ reducedMotion: "reduce" })

	test("holds still, with every step and every output shown at once", async ({ page }) => {
		await openPage(page, HOME)
		const how = page.locator(".how")
		await expect(how).not.toHaveAttribute("data-motion", "play")
		const before = await heightOf(page)
		await page.waitForTimeout(1_000)
		expect(await heightOf(page)).toBe(before)
		await expect(page.locator(".how-step")).toHaveCount(4)
		for (const step of await page.locator(".how-step").all()) await expect(step).toBeVisible()
		await expect(page.locator(".layers-pulse")).toHaveCSS("opacity", "0")
		await expect(page.locator(".section-muted [data-replay]")).toBeHidden()
	})
})
