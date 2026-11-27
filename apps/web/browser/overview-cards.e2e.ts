import { expect, test } from "@playwright/test"
import { openDemo, SCREENSHOTS } from "./demo"

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
})

test("Hide amounts leaves the chart, the ring and the bars, and masks the shortfall's figure", async ({
	page,
}) => {
	await page.setViewportSize({ width: 1280, height: 800 })
	await openDemo(page, "/", { theme: "light", hideAmounts: true })
	await expect(page.locator("[data-focus-chart]")).toBeVisible()
	await expect(page.locator("[data-summary-grid] svg").first()).toBeVisible()
	await expect(
		page.locator('[data-summary-grid] [role="img"][aria-label^="Assets by account"]'),
	).toBeVisible()
	await expect(page.locator("[data-focus-section]").getByText("193", { exact: true })).toBeVisible()

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
