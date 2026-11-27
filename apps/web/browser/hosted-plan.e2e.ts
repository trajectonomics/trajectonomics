import { expect, test } from "@playwright/test"
import { DEMO_SNAPSHOT, failures, logRequests, openHosted, snapshotsRead, strays } from "./hosted"

// The plan menu in the hosted Demo (web ADR 0028): it sits outside `main`, so the fence covers it on its own.
// Picking a plan only writes `?scenario=`; "New plan" is an Edit, and is switched off with the same title.

for (const path of ["/net-worth/", "/reports/"]) {
	test(`hosted: the plan menu on ${path} picks a plan, and switches New plan off`, async ({
		page,
	}) => {
		await page.setViewportSize({ width: 360, height: 800 })
		const requests = logRequests(page)
		await openHosted(page, path)
		await page.getByRole("button", { name: /^Plan: .+\. Change plan$/ }).click()
		const menu = page.getByRole("menu", { name: "Plans" })
		await expect(menu).toBeVisible()

		// "New plan" would open the drawer and its Make plan; the fence switches it off and says where the Edit lives.
		const newPlan = menu.getByRole("menuitem", { name: "New plan" })
		await expect(newPlan).toBeDisabled()
		await expect(newPlan).toHaveAttribute("title", /switched off in this demo/)

		// The plan choices are reads, so picking one still writes `?scenario=` and draws that plan.
		const pick = menu.getByRole("menuitemradio", { checked: false }).first()
		const name = ((await pick.textContent()) ?? "").trim()
		await pick.click()
		await expect(menu).toBeHidden()
		expect(new URL(page.url()).searchParams.get("scenario")).toBe(name)
		expect(strays(requests), "requests that are not a GET under /demo/ of this origin").toEqual([])
		expect(failures(requests), "responses with an error status under /demo/").toEqual([])
		expect(snapshotsRead(requests)).toEqual([DEMO_SNAPSHOT])
	})
}

test("hosted: the plan menu's keys skip the switched-off New plan and wrap", async ({ page }) => {
	await page.setViewportSize({ width: 360, height: 800 })
	await openHosted(page, "/net-worth/")
	await page.getByRole("button", { name: /^Plan: .+\. Change plan$/ }).click()
	const menu = page.getByRole("menu", { name: "Plans" })
	const plans = menu.getByRole("menuitemradio")
	const allPlans = menu.getByRole("menuitem", { name: "All plans" })
	await page.keyboard.press("Home")
	await expect(plans.first()).toBeFocused()
	await page.keyboard.press("End")
	await expect(allPlans).toBeFocused()
	await page.keyboard.press("ArrowDown")
	await expect(plans.first()).toBeFocused()
	await page.keyboard.press("ArrowUp")
	await expect(allPlans).toBeFocused()
})
