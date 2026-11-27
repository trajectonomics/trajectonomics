import { expect, test } from "@playwright/test"
import { openDemo } from "./demo"
import { focusPointProblems } from "./focus-point"
import { expectFocusOnAPhone, expectMaskedFocus } from "./focus-point-pages"
import { PAGES, pageName } from "./pages"

/**
 * The routes a later slice of #707 gives their focus point. Every one must still fail the rule today, so
 * this list can only shrink: a route that starts passing fails its own check until it is removed here.
 */
export const PENDING_707: Readonly<Record<string, "b" | "c">> = {
	"/assets-and-debts/": "c",
	"/cash-flow/": "b",
	"/chance/path/": "c",
	"/compare/": "c",
	"/expenses/": "c",
	"/fi/": "c",
	"/health/": "b",
	"/household/": "c",
	"/income/": "c",
	"/ledger/": "b",
	"/milestones/": "b",
	"/plans/": "c",
	"/projection/": "c",
	"/projection/years/": "c",
	"/reports/": "c",
	"/routing/": "c",
	"/settings/assumptions/": "c",
	"/settings/tax/": "c",
}

/** The six pages slice (a) gives a focus point, in #707's order. */
const FOCUS_PAGES = [
	"/net-worth/",
	"/chance/",
	"/tax/",
	"/optimize/allowances/",
	"/optimize/withdrawals/",
	"/estate/",
] as const

for (const path of PAGES) {
	const slice = PENDING_707[path]
	const title =
		slice === undefined
			? "has one focus point and one primary action"
			: `waits for slice ${slice} of #707`
	test(`${pageName(path)} ${title}`, async ({ page }) => {
		await page.setViewportSize({ width: 1280, height: 800 })
		await openDemo(page, path, { theme: "light" })
		const problems = await page.evaluate(focusPointProblems)
		if (slice === undefined) expect(problems, path).toEqual([])
		else expect(problems.length, `${path} still fails for slice ${slice}`).toBeGreaterThan(0)
	})
}

test("a second answer and a second primary action are both reported", async ({ page }) => {
	await page.setViewportSize({ width: 1280, height: 800 })
	await openDemo(page, "/net-worth/", { theme: "light" })
	expect(await page.evaluate(focusPointProblems)).toEqual([])
	await page.evaluate(() => {
		const main = document.querySelector("main")
		if (main === null) throw new Error("no main")
		const answer = document.createElement("p")
		answer.textContent = "A second answer"
		answer.style.fontSize = "40px"
		// The page has no primary action of its own, so this draws a first filled one and then a second.
		const filled = (text: string): HTMLButtonElement => {
			const button = document.createElement("button")
			button.type = "button"
			button.textContent = text
			button.style.backgroundColor = getComputedStyle(main).color
			return button
		}
		main.append(answer, filled("A primary action"), filled("A second primary action"))
	})
	const problems = (await page.evaluate(focusPointProblems)).join("\n")
	expect(problems).toContain("2 elements draw text above 28px")
	expect(problems).toContain("2 primary actions")
})

for (const path of FOCUS_PAGES) {
	test(`${pageName(path)} keeps its focus point inside 360px and states the answer`, async ({
		page,
	}) => {
		await page.setViewportSize({ width: 360, height: 800 })
		await openDemo(page, path, { theme: "light" })
		await expectFocusOnAPhone(page, path)
	})
}

for (const path of FOCUS_PAGES) {
	test(`${pageName(path)} masks its focus amount with Hide amounts on`, async ({ page }) => {
		await page.setViewportSize({ width: 1280, height: 800 })
		await openDemo(page, path, { theme: "light", hideAmounts: true })
		await expectMaskedFocus(page, path)
	})
}
