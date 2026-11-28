import { expect, test } from "@playwright/test"
import { openDemo, SCREENSHOTS } from "./demo"
import { measureOverflow } from "./fit"
import { lineHitsTheLabel } from "./focus-line"
import { skipMaskingCheck } from "./masking"
import { visibleTextOf } from "./visible-text"

// The summary below the focus point is a grid of quiet cards: each one is a single stretched link with
// its Details outside it, and a plan that runs out writes its month on the chart with its shortfall
// under the axis.
test("every summary card is one link, and its Details sits outside that link", async ({ page }) => {
	await page.setViewportSize({ width: 1280, height: 800 })
	await openDemo(page, "/", { theme: "light" })
	const cards = page.locator("[data-summary-grid] > section")
	const count = await cards.count()
	expect(count, "the summary's cards").toBe(8)
	for (let index = 0; index < count; index++) {
		const shape = await cards.nth(index).evaluate((element) => ({
			links: element.querySelectorAll("a").length,
			nested: element.querySelectorAll("a a, a button, a input, a select, a textarea, a details")
				.length,
			detailsInLink: [...element.querySelectorAll("a")].some(
				(anchor) => anchor.querySelector("details") !== null,
			),
		}))
		expect(shape.links, `card ${index + 1}'s links`).toBe(1)
		expect(shape.nested, `card ${index + 1}'s nested controls`).toBe(0)
		expect(shape.detailsInLink, `card ${index + 1}'s Details inside its link`).toBe(false)
	}
})

test("a plan that runs out puts its month on the chart and its shortfall under it", async ({
	page,
}) => {
	await page.setViewportSize({ width: 1280, height: 800 })
	await openDemo(page, "/?scenario=retire-early", { theme: "light" })
	await expect(page.locator("[data-focus-answer]")).toHaveText("Feb 2053")
	await expect(page.locator("[data-focus-heading]")).toContainText(
		"Your money runs out in Feb 2053, at 62.",
	)
	await expect(page.locator("[data-focus-heading]")).toContainText(
		"39,410.06 THB short by the end of the plan.",
	)
	await expect(page.getByRole("link", { name: "See where it runs out" })).toBeVisible()
	await page.screenshot({
		path: `${SCREENSHOTS}/screen/1280/light/home-runs-out.png`,
		fullPage: true,
	})

	// The same plan on a phone: the answer stays clear of the line, and the page does not scroll sideways.
	await page.setViewportSize({ width: 360, height: 800 })
	await openDemo(page, "/?scenario=retire-early", { theme: "light" })
	await expect(page.locator("[data-focus-answer]")).toHaveText("Feb 2053")
	const hits = await page.evaluate(lineHitsTheLabel)
	expect(hits, "the line through the label's box").toEqual([])
	const fit = await measureOverflow(page, true)
	expect(fit.scrollWidth, "the page's scroll width").toBeLessThanOrEqual(fit.innerWidth)
	await page.screenshot({
		path: `${SCREENSHOTS}/screen/360/light/home-runs-out.png`,
		fullPage: true,
	})
})

// The Demo has no plan whose FI read is unreachable, so there is no unreachable screen to photograph:
// `retire-early` is unreachable but wins the focus point as a plan that runs out.
test("Hide amounts leaves the chart, the ring and the bars, and masks every card's figure", async ({
	page,
}) => {
	skipMaskingCheck()
	await page.setViewportSize({ width: 1280, height: 800 })
	await openDemo(page, "/", { theme: "light", hideAmounts: true })
	await expect(page.locator("[data-focus-chart]")).toBeVisible()
	await expect(page.locator("[data-summary-grid] svg").first()).toBeVisible()
	await expect(
		page.locator('[data-summary-grid] [role="img"][aria-label^="Assets by account"]'),
	).toBeVisible()
	await expect(page.locator("[data-focus-section]").getByText("193", { exact: true })).toBeVisible()

	const cards = page.locator("[data-summary-grid] > section")
	const count = await cards.count()
	expect(count, "the summary's cards").toBe(8)
	for (let index = 0; index < count; index++) {
		const text = await visibleTextOf(cards.nth(index))
		const withoutRates = text.replace(/\d+\.\d+%/g, "")
		expect(withoutRates, `card ${index + 1} states no money`).not.toMatch(/\d[\d,]*\.\d\d/)
	}
	const masks = await page.locator("[data-summary-grid]").getByText("•••••").count()
	expect(masks, "the cards' masked amounts").toBeGreaterThanOrEqual(7)

	await openDemo(page, "/?scenario=retire-early", { theme: "light", hideAmounts: true })
	await expect(page.locator("[data-focus-heading]")).toContainText(
		"The amount short by the end of the plan is hidden.",
	)
	await expect(page.getByText("−39.4k")).toHaveCount(0)
})

test("the Net worth page opens with the profit and loss", async ({ page }) => {
	await page.setViewportSize({ width: 1280, height: 800 })
	await openDemo(page, "/net-worth/", { theme: "light" })
	await expect(
		page.getByRole("heading", { level: 2, name: "Profit and loss, year to date" }),
	).toBeVisible()
})
