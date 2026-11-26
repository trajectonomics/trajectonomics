import { expect, test } from "@playwright/test"
import { chooseBeforeLoad, settle } from "./demo"
import { expectNoSidewaysScroll, LONG, longFlow, longFlows, serve, VIEWPORT } from "./long-labels"

test("Cash flow and Withdrawals name an 80-character Flow and stay 360px wide", async ({
	page,
}) => {
	await page.setViewportSize(VIEWPORT)
	await serve(page, await longFlows(page))
	await chooseBeforeLoad(page, { theme: "light" })
	for (const path of ["/cash-flow/", "/optimize/withdrawals/"]) {
		await page.goto(path)
		await settle(page, "light")
		await expectNoSidewaysScroll(page)
	}
})

// The Edit controls are drawn only while a server answers a session, and never for the Demo snapshot, so this
// serves the patched Snapshot as the person's own and fakes only the token: the page renders its Change control,
// and the click opens the form's drawer. Nothing is written.
test("the Withdrawals Edit button and its drawer fit an 80-character Flow name at 360px", async ({
	page,
}) => {
	await page.setViewportSize(VIEWPORT)
	await serve(page, await longFlow(page))
	await page.route(/\/edit-session$/, (route) => route.fulfill({ json: { token: "browser" } }))
	await chooseBeforeLoad(page, { theme: "light" })
	await page.goto("/optimize/withdrawals/")
	await settle(page, "light")
	const change = page.getByRole("button", { name: `Change ${LONG}` })
	await expect(change).toBeVisible()
	await expectNoSidewaysScroll(page)
	await change.click()
	const drawer = page.getByRole("dialog")
	await expect(drawer.getByRole("heading", { name: `Change ${LONG}` })).toBeVisible()
	const fit = await drawer.evaluate((element) => ({
		scrollWidth: element.scrollWidth,
		clientWidth: element.clientWidth,
	}))
	expect(fit.scrollWidth, "the drawer's scroll width").toBeLessThanOrEqual(fit.clientWidth)
	const box = await drawer.boundingBox()
	expect(box?.width ?? Number.POSITIVE_INFINITY).toBeLessThanOrEqual(VIEWPORT.width)
})
