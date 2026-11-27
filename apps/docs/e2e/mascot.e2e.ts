import type { Page } from "@playwright/test"
import { DOCS_BASE_PATH } from "../src/lib/tabs"
import { NOT_FOUND_PATH, openPage } from "./built-site"
import { waitForIsland } from "./docs-portal"
import { expect, test } from "./fixtures"
import { TEST_VIEWPORT_HEIGHT_PX } from "./viewports"

const LANDING_PATH = `${DOCS_BASE_PATH}/`
const QUICKSTART_PATH = `${DOCS_BASE_PATH}/cli/`

/** A rendered box, in the page's viewport coordinates. */
interface Box {
	readonly x: number
	readonly y: number
	readonly width: number
	readonly height: number
}

/** Whether two rendered boxes share a pixel. */
function overlaps(left: Box, right: Box): boolean {
	return (
		left.x < right.x + right.width &&
		right.x < left.x + left.width &&
		left.y < right.y + right.height &&
		right.y < left.y + left.height
	)
}

/** The Mascot's box, after asserting a reader gets no words, focus or pointer from it. */
async function mascotBox(page: Page, pose: string): Promise<Box> {
	const image = page.locator(`img[data-mascot="${pose}"]`)
	await expect(image, `the ${pose} Mascot is on the page`).toHaveCount(1)
	await expect(image).toHaveAttribute("alt", "")
	await expect(image).toHaveAttribute("aria-hidden", "true")
	await expect(image).toHaveCSS("pointer-events", "none")
	const box = await image.boundingBox()
	if (box === null) throw new Error(`the ${pose} Mascot is laid out`)
	expect(box.width, `the ${pose} Mascot has width`).toBeGreaterThan(0)
	expect(box.height, `the ${pose} Mascot has height`).toBeGreaterThan(0)
	return box
}

/** Every rendered box matching `selector`. */
async function boxesOf(page: Page, selector: string): Promise<readonly Box[]> {
	const found: Box[] = []
	for (const element of await page.locator(selector).all()) {
		const box = await element.boundingBox()
		if (box !== null) found.push(box)
	}
	return found
}

/** Every line of text a heading renders, not its full-width block box. */
async function headingTextBoxes(page: Page): Promise<readonly Box[]> {
	return page.evaluate(() => {
		const boxes: Box[] = []
		for (const heading of document.querySelectorAll("h1, h2, h3")) {
			const range = document.createRange()
			range.selectNodeContents(heading)
			for (const rect of range.getClientRects()) {
				if (rect.width > 0 && rect.height > 0) {
					boxes.push({ x: rect.x, y: rect.y, width: rect.width, height: rect.height })
				}
			}
		}
		return boxes
	})
}

/** Assert the Mascot covers no heading's words on the page. */
async function expectClearOfHeadings(page: Page, pose: string, box: Box): Promise<void> {
	for (const heading of await headingTextBoxes(page)) {
		expect(overlaps(box, heading), `the ${pose} Mascot covers a heading`).toBe(false)
	}
}

/** Assert the image really loads, not only reserves its box. */
async function expectLoaded(page: Page, pose: string): Promise<void> {
	const image = page.locator(`img[data-mascot="${pose}"]`)
	await image.scrollIntoViewIfNeeded()
	await expect
		.poll(() => image.evaluate((element) => (element as HTMLImageElement).naturalWidth))
		.toBeGreaterThan(0)
}

for (const widthPx of [1280, 390]) {
	test(`the Landing Page's Mascots fit and cover nothing at ${widthPx}px`, async ({ page }) => {
		await page.setViewportSize({ width: widthPx, height: TEST_VIEWPORT_HEIGHT_PX })
		await openPage(page, LANDING_PATH)
		await waitForIsland(page)

		const peek = await mascotBox(page, "peek")
		await expectClearOfHeadings(page, "peek", peek)
		for (const button of await boxesOf(
			page,
			'section[aria-labelledby="agent-start-heading"] button',
		)) {
			expect(overlaps(peek, button), "the peek Mascot covers the prompt panel's button").toBe(false)
		}
		const picture = await page
			.locator('ol[aria-label="How a question gets its answer"]')
			.boundingBox()
		if (picture === null) throw new Error("the hero picture is laid out")
		expect(overlaps(peek, picture), "the peek Mascot covers the hero picture").toBe(false)
		await expectLoaded(page, "peek")

		const wave = await mascotBox(page, "wave")
		await expectClearOfHeadings(page, "wave", wave)
		await expectLoaded(page, "wave")
	})

	test(`the 404 page's Mascot sits above the heading and covers nothing at ${widthPx}px`, async ({
		page,
	}) => {
		await page.setViewportSize({ width: widthPx, height: TEST_VIEWPORT_HEIGHT_PX })
		await openPage(page, NOT_FOUND_PATH)
		await waitForIsland(page)

		const lost = await mascotBox(page, "lost")
		await expectClearOfHeadings(page, "lost", lost)
		await expectLoaded(page, "lost")
	})

	test(`the Quickstart's Mascot sits with the title and covers nothing at ${widthPx}px`, async ({
		page,
	}) => {
		await page.setViewportSize({ width: widthPx, height: TEST_VIEWPORT_HEIGHT_PX })
		await openPage(page, QUICKSTART_PATH)
		await waitForIsland(page)

		const chart = await mascotBox(page, "chart")
		await expectClearOfHeadings(page, "chart", chart)
		await expectLoaded(page, "chart")
	})
}
