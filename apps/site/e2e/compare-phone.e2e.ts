import { expect, type Page, test } from "@playwright/test"
import { COMPARE_ALONE, sequenceTimeline } from "../src/lib/motion/timeline"
import { homeOf, openPage } from "./pages"

/** The English home, whose comparison a phone reads one panel at a time. */
const HOME = homeOf("en")

/** How long the before chat takes to be read, and then the five seconds its offer counts down. */
const READ_MS = sequenceTimeline(COMPARE_ALONE).totalMs
const COUNTDOWN_MS = 5_000

/** The two panels and the one slot under them, as a phone lays them out. */
async function layout(page: Page) {
	return page.evaluate(() => {
		const wrap = document.querySelector("[data-action-compare]")
		const panels = [...document.querySelectorAll(".compare-panel")].map((panel) => {
			const box = panel.getBoundingClientRect()
			return {
				side: panel.getAttribute("data-side"),
				top: Math.round(box.top),
				height: Math.round(box.height),
			}
		})
		const slot = document.querySelector(".compare-cta")
		const top = slot?.getBoundingClientRect().top ?? 0
		return {
			stage: wrap?.getAttribute("data-action-stage") ?? null,
			panels,
			// From the document's top, so the page's own scroll position cannot move the control.
			slotTop: Math.round(top + window.scrollY),
			slotHeight: Math.round(slot?.getBoundingClientRect().height ?? 0),
		}
	})
}

test.describe("the comparison on a phone with motion allowed", () => {
	test.use({ viewport: { width: 375, height: 812 }, reducedMotion: "no-preference" })

	test("shows one panel at a time, and holds one slot under them for the control", async ({
		page,
	}) => {
		await openPage(page, HOME)
		await expect(page.locator("[data-action-compare]")).toHaveAttribute(
			"data-action-stage",
			"without",
		)
		await expect(page.locator('.compare-panel[data-side="without"]')).toBeVisible()
		await expect(page.locator('.compare-panel[data-side="with"]')).toBeHidden()
		const { slotHeight, panels } = await layout(page)
		// The slot is a reserved row, so the control can appear in it without moving the page.
		expect(slotHeight).toBeGreaterThanOrEqual(44)
		expect(panels[0]?.height).toBeGreaterThan(200)
	})

	test("offers the after panel when the before chat has been read, counts down, and moves on its own", async ({
		page,
	}) => {
		test.setTimeout(60_000)
		await openPage(page, HOME)
		const offer = page.locator("[data-action-next]")
		await expect(offer).toBeHidden()
		// The offer is drawn only once the bad chat has been read: the countdown starts then.
		await expect(offer).toBeVisible({ timeout: READ_MS + 5_000 })
		const digits = async () => {
			const text = (await offer.textContent()) ?? ""
			return Number.parseInt(text.slice(text.indexOf("(") + 1), 10)
		}
		const started = await digits()
		expect(started).toBeGreaterThanOrEqual(3)
		expect(started).toBeLessThanOrEqual(5)
		// It counts down, visibly, and then moves on its own.
		await expect.poll(digits).toBeLessThan(started)
		await expect(page.locator("[data-action-compare]")).toHaveAttribute(
			"data-action-stage",
			"with",
			{ timeout: COUNTDOWN_MS + 3_000 },
		)
		await expect(page.locator('.compare-panel[data-side="with"]')).toBeVisible()
	})

	test("a tap on the offer opens the after panel at once, with no jump", async ({ page }) => {
		test.setTimeout(60_000)
		await openPage(page, HOME)
		const offer = page.locator("[data-action-next]")
		await expect(offer).toBeVisible({ timeout: READ_MS + 3_000 })
		const before = await layout(page)
		await offer.click()
		await expect(page.locator("[data-action-compare]")).toHaveAttribute("data-action-stage", "with")
		await expect(page.locator("[data-action-again]")).toBeVisible()
		const after = await layout(page)
		// One slot, one size, one place: the panels and the control stay exactly where they were.
		expect(after.slotTop).toBe(before.slotTop)
		expect(after.slotHeight).toBe(before.slotHeight)
		expect(after.panels[1]?.height).toBe(before.panels[0]?.height)
	})
})
