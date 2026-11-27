import {
	agentPrompt,
	agentRoutes,
	COPIED_LABEL,
	COPY_FAILED_LABEL,
	COPY_PROMPT_LABEL,
} from "../src/lib/agent-start"
import { readReleaseLine } from "../src/lib/release-line-source"
import { SITE_ORIGIN } from "../src/lib/site"
import { SITE_HOME_PATH } from "../src/lib/site-home"
import { DOCS_BASE_PATH, TABS, tabUrl } from "../src/lib/tabs"
import { openSearch, otherTab, searchTerm, waitForIsland } from "./docs-portal"
import { expect, test } from "./fixtures"
import { TEST_VIEWPORT_HEIGHT_PX } from "./viewports"

const LANDING_PATH = `${DOCS_BASE_PATH}/`

/** The release line the built page must state: the newest cli tag this checkout sees, or none. */
const RELEASE_LINE = readReleaseLine()

/** Whether `url` is the Site Home, the Site Worker's root (ADR 0017). */
function isSiteHome(url: URL): boolean {
	return url.pathname === SITE_HOME_PATH && url.search === "" && url.hash === ""
}

/** A Site Home document, so the browser test never asks the network for trajectonomics.com. */
const SITE_HOME_DOCUMENT = "<!doctype html><html lang='en'><title>Site Home</title></html>"

test("the /docs mount reaches the Landing Page", async ({ page }) => {
	const response = await page.goto(DOCS_BASE_PATH)

	expect(response?.status()).toBe(200)
	await expect(page).toHaveURL(LANDING_PATH)
	await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
})

test("the hero picture keeps its column clear of the prompt at 1024px", async ({ page }) => {
	await page.setViewportSize({ width: 1024, height: TEST_VIEWPORT_HEIGHT_PX })
	await page.goto(LANDING_PATH)

	const edges = await page.evaluate(() => {
		const picture = document.querySelector('ol[aria-label="How a question gets its answer"]')
		const prompt = document.querySelector('section[aria-labelledby="agent-start-heading"]')
		return picture === null || prompt === null
			? null
			: {
					pictureRight: picture.getBoundingClientRect().right,
					promptLeft: prompt.getBoundingClientRect().left,
				}
	})
	if (edges === null) throw new Error("the hero picture or the prompt panel is missing")

	expect(edges.pictureRight, "the hero picture ends before the prompt begins").toBeLessThanOrEqual(
		edges.promptLeft,
	)
})

test("the Landing Page has one entry per audience, each linking to its Tab", async ({ page }) => {
	await page.goto(LANDING_PATH)

	const entries = page.getByRole("main").getByRole("link", { name: /^For / })
	await expect(entries).toHaveCount(TABS.length)
	for (const tab of TABS) {
		await expect(page.getByRole("link", { name: tab.entry, exact: true })).toHaveAttribute(
			"href",
			tabUrl(tab),
		)
	}
})

test("each audience entry says what its reader gets", async ({ page }) => {
	await page.goto(LANDING_PATH)

	for (const tab of TABS) {
		const link = page.getByRole("link", { name: tab.entry, exact: true })
		const descriptionId = await link.getAttribute("aria-describedby")
		expect(descriptionId, `${tab.folder} entry describes its reader's next step`).not.toBeNull()
		await expect(page.locator(`#${descriptionId}`)).toHaveText(tab.description)
	}
})

test("the Landing Page states the newest traj release this build sees", async ({ page }) => {
	test.skip(RELEASE_LINE === undefined, "this checkout has no cli-v tag, so the line is omitted")
	await page.goto(LANDING_PATH)

	await expect(page.getByText(RELEASE_LINE ?? "", { exact: true })).toBeVisible()
})

test("the Landing Page ends with Site Home, Source and License links", async ({ page }) => {
	await page.goto(LANDING_PATH)

	await expect(page.getByRole("link", { name: "Site Home", exact: true })).toHaveAttribute(
		"href",
		SITE_HOME_PATH,
	)
	await expect(page.getByRole("link", { name: "Source", exact: true })).toHaveAttribute(
		"href",
		"https://github.com/trajectonomics/trajectonomics/tree/main/apps/docs",
	)
	await expect(page.getByRole("link", { name: "License", exact: true })).toHaveAttribute(
		"href",
		"https://github.com/trajectonomics/trajectonomics/blob/main/apps/docs/LICENSE",
	)
})

test("the ending's Site Home link loads the Site Home as one document and never prefetches", async ({
	page,
}) => {
	await page.goto(LANDING_PATH)
	await page.route(
		(url) => isSiteHome(url),
		(route) => route.fulfill({ status: 200, contentType: "text/html", body: SITE_HOME_DOCUMENT }),
	)

	const siteHomeRequests: string[] = []
	page.on("request", (request) => {
		if (isSiteHome(new URL(request.url()))) {
			siteHomeRequests.push(request.resourceType())
		}
	})

	const link = page.getByRole("link", { name: "Site Home", exact: true })
	await link.hover()
	// Longer than Astro's 80ms hover prefetch debounce.
	await page.waitForTimeout(300)
	expect(siteHomeRequests, "hovering fetched the Site Home").toEqual([])

	await link.click()
	await expect.poll(() => siteHomeRequests).toEqual(["document"])
	await expect(page).toHaveURL(SITE_HOME_PATH)
})

test("an audience entry opens its Tab", async ({ page }) => {
	const tab = otherTab(TABS[0])
	await page.goto(LANDING_PATH)

	await page.getByRole("link", { name: tab.entry, exact: true }).click()

	await expect(page).toHaveURL(tabUrl(tab))
})

test("search opens on the Landing Page and does not offer the Landing Page", async ({ page }) => {
	await page.goto(LANDING_PATH)

	await openSearch(page)
	await page.getByRole("combobox", { name: "Search" }).fill(searchTerm(TABS[0]))

	await expect(page.getByRole("option").first()).toBeVisible()
	await expect(page.getByRole("option").filter({ hasText: "Trajectonomics Docs" })).toHaveCount(0)
})

test("Copy prompt puts the Agent prompt on the clipboard and says so", async ({
	page,
	context,
}) => {
	await context.grantPermissions(["clipboard-read", "clipboard-write"])
	await page.goto(LANDING_PATH)
	await waitForIsland(page)

	await page.getByRole("button", { name: COPY_PROMPT_LABEL, exact: true }).click()

	await expect(page.getByRole("button", { name: COPIED_LABEL, exact: true })).toBeVisible()
	await expect(page.getByRole("status").filter({ hasText: "prompt copied" })).toHaveCount(1)
	expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(agentPrompt(SITE_ORIGIN))
})

test("the Landing Page shows the prompt it copies and each Agent route with its own copy control", async ({
	page,
}) => {
	await page.goto(LANDING_PATH)

	await expect(page.locator("[data-agent-prompt]")).toHaveText(agentPrompt(SITE_ORIGIN))
	for (const route of agentRoutes(SITE_ORIGIN)) {
		await expect(page.getByText(route.snippet, { exact: true })).toBeVisible()
		await expect(
			page.getByRole("button", { name: `Copy ${route.title}`, exact: true }),
		).toBeVisible()
	}
})

test("Copy prompt says so when the browser refuses the clipboard", async ({ page }) => {
	await page.addInitScript(() => {
		Object.defineProperty(navigator, "clipboard", {
			value: { writeText: () => Promise.reject(new Error("denied")) },
		})
	})
	await page.goto(LANDING_PATH)
	await waitForIsland(page)

	await page.getByRole("button", { name: COPY_PROMPT_LABEL, exact: true }).click()

	await expect(page.getByRole("button", { name: COPY_FAILED_LABEL, exact: true })).toBeVisible()
	await expect(page.getByRole("status").filter({ hasText: "was not copied" })).toHaveCount(1)
})
