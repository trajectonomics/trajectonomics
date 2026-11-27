import { expect, test } from "@playwright/test"
import { BASE_URL } from "./base-url"
import { chooseBeforeLoad, settle } from "./demo"
import { openHosted } from "./hosted"
import { enabledControls, SEEDED_CHART, seedChart } from "./hosted-controls"
import { PAGES, pageName } from "./pages"

// A control that only reads must stay on in the hosted Demo (web ADR 0028): the fence switches off Edits, not reads.
// The loopback Demo (`?demo=1`) hides every Edit control, so each control it leaves on only reads.
const HEIGHT_PX = 800

for (const path of PAGES) {
	test(`hosted ${pageName(path)}: every control that is on in the loopback Demo is on here too`, async ({
		page,
		context,
	}) => {
		await page.setViewportSize({ width: 1280, height: HEIGHT_PX })
		await seedChart(page)
		const query = `chart=${SEEDED_CHART}`
		await openHosted(page, path, "light", `?${query}`)
		// The picker, Import and Export live behind the Charts panel, so both builds open it before the lists compare.
		if (path === "/projection/") {
			await page.getByRole("button", { name: "Charts", exact: true }).click()
		}
		const hosted = await enabledControls(page)
		if (path === "/projection/") {
			const own = page.getByRole("group", { name: "This chart" }).getByRole("button")
			await expect(own, "the seeded chart's Edit, Duplicate and Delete").toHaveCount(3)
			await expect(own.first()).toBeEnabled()
		}
		// An `aria-pressed` toggle inside an Edit form fills a switched-off field, so it is off too.
		if (path === "/settings/assumptions/") {
			const swing = page.getByRole("group", { name: "Fill in a swing" }).getByRole("button")
			await expect(swing.first()).toBeDisabled()
		}

		// The same page of the loopback build, with the Edit controls hidden (`?demo=1`): what is on there only reads.
		const loopback = await context.newPage()
		await loopback.setViewportSize({ width: 1280, height: HEIGHT_PX })
		await seedChart(loopback)
		await chooseBeforeLoad(loopback, { theme: "light" })
		await loopback.goto(`${BASE_URL}${path}?demo=1&${query}`)
		await settle(loopback, "light")
		if (path === "/projection/") {
			await loopback.getByRole("button", { name: "Charts", exact: true }).click()
		}
		const reads = await enabledControls(loopback)

		const left = [...hosted]
		const switchedOff = reads.filter((line) => {
			const at = left.indexOf(line)
			if (at < 0) return true
			left.splice(at, 1)
			return false
		})
		expect(switchedOff, "controls on in the loopback Demo and off in the hosted one").toEqual([])
	})
}
