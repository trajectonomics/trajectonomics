import { expect, type Page } from "@playwright/test"
import { measureOverflow } from "./fit"

/**
 * The answer each page of slices (a) and (b) states, and the words its screen-reader heading must carry.
 * The heading is the whole answer: the picture is `aria-hidden`, so a screen reader hears only this.
 */
export const ANSWERS: Readonly<Record<string, readonly string[]>> = {
	"/net-worth/": ["What are you worth today?", "1.21M THB as of 31 Oct 2026."],
	"/chance/": ["How likely is your plan to last?", "96.5% chance.", "193 of 200"],
	"/tax/": ["How much tax for 2026?", "99k THB", "You could still save 91.7k THB."],
	"/optimize/allowances/": ["How much tax could you still save?", "91.7k THB", "in 2026."],
	"/optimize/withdrawals/": [
		"What could you spend in retirement?",
		"862k THB",
		"3.99% of your savings.",
	],
	"/estate/": ["What would your heirs receive?", "15.6M THB in 2053."],
	"/cash-flow/": [
		"Where does your money go in 2026?",
		"295k THB left over.",
		"2.42M THB coming in.",
	],
	"/milestones/": ["What's next?", "Car paid off in Jan 2031.", "At 40."],
	"/health/": ["Is everything in order?", "All good."],
	"/ledger/": [
		"When did you last record your accounts?",
		"28 Oct 2026.",
		"3 accounts, 0 not recorded in the last month.",
	],
}

/** The ten pages #707 gives a focus point so far, in the issue's order. */
export const FOCUS_PAGES = [
	"/net-worth/",
	"/chance/",
	"/tax/",
	"/optimize/allowances/",
	"/optimize/withdrawals/",
	"/estate/",
	"/cash-flow/",
	"/milestones/",
	"/health/",
	"/ledger/",
] as const

/** The focus pages whose answer is money, which Hide amounts must mask. Chance states a rate, and stays. */
export const MASKED_FOCUS_PAGES = [
	"/net-worth/",
	"/chance/",
	"/tax/",
	"/optimize/allowances/",
	"/optimize/withdrawals/",
	"/estate/",
	"/cash-flow/",
] as const

/** A phone keeps the focus point inside the page and its 300px, its answer inside its box, and states the whole answer. */
export async function expectFocusOnAPhone(page: Page, path: string): Promise<void> {
	const fit = await measureOverflow(page, true)
	expect(fit.scrollWidth, "the phone's scroll width").toBeLessThanOrEqual(fit.innerWidth)
	const visual = await page.locator("[data-focus-visual]").boundingBox()
	const answer = await page.locator("[data-focus-answer]").boundingBox()
	expect(answer, "the answer's box").not.toBeNull()
	expect(visual, "the visual's box").not.toBeNull()
	expect(visual?.height ?? 0, "the visual's height").toBeLessThanOrEqual(300)
	expect((answer?.x ?? 0) + (answer?.width ?? 0)).toBeLessThanOrEqual(
		(visual?.x ?? 0) + (visual?.width ?? 0) + 1,
	)
	expect(
		await page
			.locator("[data-focus-answer]")
			.evaluate((one) => one.scrollWidth <= one.clientWidth + 1),
		"the answer is wider than its box",
	).toBe(true)
	const heading = await page.locator("[data-focus-heading]").textContent()
	for (const words of ANSWERS[path] ?? []) expect(heading ?? "", words).toContain(words)
}

/**
 * Hide amounts masks each focus figure read from the unmasked page, and the heading says so; a rate is not money
 * and stays.
 */
export async function expectMaskedFocus(
	page: Page,
	path: string,
	figures: readonly string[],
): Promise<void> {
	const visual = page.locator("[data-focus-visual]")
	const text = await visual.textContent()
	const heading = await page.locator("[data-focus-heading]").textContent()
	if (path === "/chance/") {
		for (const figure of figures) expect(text, path).toContain(figure)
		expect(heading).toContain("96.5% chance.")
		return
	}
	for (const figure of figures) expect(text, `${path}: ${figure}`).not.toContain(figure)
	expect(text, path).toContain("•••••")
	expect(heading, path).toContain("The amount is hidden")
}
