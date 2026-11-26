import { expect, test } from "@playwright/test"
import { chooseBeforeLoad, openDemo, settle } from "./demo"
import { expectNoSidewaysScroll, LONG, longNamed, MILESTONE, serve, VIEWPORT } from "./long-labels"

for (const [name, path] of [
	["the Expenses cards", "/expenses/"],
	["the Routing moves", "/routing/"],
	["the Assets payout", "/assets-and-debts/"],
] as const) {
	test(`${name} wrap an 80-character Milestone name at 360px`, async ({ page }) => {
		await page.setViewportSize(VIEWPORT)
		await serve(page, await longNamed(page))
		await openDemo(page, path, { theme: "light" })
		await expectNoSidewaysScroll(page)
	})
}

test("the Milestones What-if panel wraps an 80-character name at 360px", async ({ page }) => {
	await page.setViewportSize(VIEWPORT)
	const snapshot = await longNamed(page)
	await serve(page, snapshot)
	// The session needs a token, and its answer can be the Demo's own compare: these rows read only the dates.
	await page.route(/\/edit-session$/, (route) => route.fulfill({ json: { token: "browser" } }))
	await page.route(/\/what-if$/, (route) =>
		route.fulfill({
			json: {
				ok: true,
				reads: {
					projection: snapshot.reads.projections["base"],
					fi: snapshot.reads.fi["base"],
					compare: snapshot.reads.compare,
					chance: snapshot.reads.chance["base"] ?? null,
				},
			},
		}),
	)
	await chooseBeforeLoad(page, { theme: "light" })
	await page.goto("/expenses/")
	await settle(page, "light")
	// One switch opens the session, and no reload follows: the client keeps it across the page change.
	await page.getByRole("switch").first().click()
	await page.getByRole("button", { name: "Open the menu" }).click()
	await page.getByRole("link", { name: "Milestones" }).click()
	const panel = page.getByRole("region", { name: "What-if on base" })
	await expect(panel.getByText(LONG)).toBeVisible()
	// The Milestones page's own timeline is #641's overflow; the panel here must wrap its name on its own.
	const fit = await panel.evaluate((element) => ({
		scrollWidth: element.scrollWidth,
		clientWidth: element.clientWidth,
	}))
	expect(fit.scrollWidth, "the panel's scroll width").toBeLessThanOrEqual(fit.clientWidth)
	const box = await panel.boundingBox()
	expect(box?.width ?? Number.POSITIVE_INFINITY).toBeLessThanOrEqual(360)
})

test("the What-if bar wraps an 80-character Milestone name at 360px", async ({ page }) => {
	await page.setViewportSize(VIEWPORT)
	const snapshot = await longNamed(page)
	const read = snapshot.reads.documents["base"]
	const move = read?.data?.scenario.document.flows.find((flow) => flow.id === "move-once")
	if (move === undefined) throw new Error("the patched Demo has the move")
	// The stored move starts at another Milestone, so picking the named one is a change the bar lists.
	// Its growth is stated, so the form's edit is a Set of `startAt` alone and the bar words the new Milestone.
	move["startAt"] = "sabbatical"
	move["growth"] = { bps: 0 }
	await serve(page, snapshot)
	await page.route(/\/edit-session$/, (route) => route.fulfill({ json: { token: "browser" } }))
	await page.route(/\/what-if$/, (route) =>
		route.fulfill({
			json: {
				ok: true,
				reads: {
					projection: snapshot.reads.projections["base"],
					fi: snapshot.reads.fi["base"],
					compare: snapshot.reads.compare,
					chance: snapshot.reads.chance["base"] ?? null,
				},
			},
		}),
	)
	await chooseBeforeLoad(page, { theme: "light" })
	await page.goto("/routing/")
	await settle(page, "light")
	const moves = page.locator('section[aria-labelledby="moves"]')
	await moves.getByRole("button", { name: /^Try a value for/ }).click()
	await page.locator("#move-milestone").selectOption(MILESTONE)
	await page.getByRole("button", { name: "Try this value" }).click()
	const bar = page.getByRole("region", { name: "What-if session" })
	await expect(bar.getByText(LONG)).toBeVisible()
	await expectNoSidewaysScroll(page)
})
