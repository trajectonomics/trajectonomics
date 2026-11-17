import type { Page } from "@playwright/test"

/** The colour one role paints, as the browser resolves it: a probe element turns the token into rgb. */
export function paintedColour(page: Page, role: string): Promise<string> {
	return page.evaluate((name) => {
		const token = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
		const probe = document.createElement("span")
		probe.style.color = token
		document.body.append(probe)
		const painted = getComputedStyle(probe).color
		probe.remove()
		return painted
	}, role)
}
