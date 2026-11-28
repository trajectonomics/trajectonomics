import type { Page } from "@playwright/test"
import { HOSTED_ORIGIN, HOSTED_PREFIX } from "./base-url"
import { chooseBeforeLoad, settle } from "./demo"

/** The one file the hosted Demo may read besides its own pages and assets: the Demo snapshot, under the base path. */
export const DEMO_SNAPSHOT = `${HOSTED_PREFIX}/demo/snapshot.json`

/** Every request a page makes, as Playwright's log has it. */
export interface Requests {
	/** `METHOD url` for each request, in order. */
	readonly seen: string[]
	/** `STATUS url` for each response, in order. */
	readonly answered: string[]
}

/** Starts the log. Call it before `openHosted`, so the first request is in it. */
export function logRequests(page: Page): Requests {
	const seen: string[] = []
	const answered: string[] = []
	page.on("request", (request) => seen.push(`${request.method()} ${request.url()}`))
	page.on("response", (response) => answered.push(`${response.status()} ${response.url()}`))
	return { seen, answered }
}

/** The responses under the base path that are an error (status 400 or more): a page that links to a file the build does not hold. */
export function failures(requests: Requests): string[] {
	return requests.answered.filter((line) => {
		const [status = "0", url = ""] = line.split(" ")
		return Number(status) >= 400 && new URL(url).pathname.startsWith(`${HOSTED_PREFIX}/`)
	})
}

/** The requests that are not a GET of something under the hosted build's own origin and base path. */
export function strays(requests: Requests): string[] {
	return requests.seen.filter((line) => {
		const [method = "", url = ""] = line.split(" ")
		const { origin, pathname } = new URL(url)
		return method !== "GET" || origin !== HOSTED_ORIGIN || !pathname.startsWith(`${HOSTED_PREFIX}/`)
	})
}

/** The Snapshot files a page asked for: any request for a `.json` file that is not SvelteKit's own `version.json`. */
export function snapshotsRead(requests: Requests): string[] {
	return [
		...new Set(
			requests.seen
				.map((line) => new URL(line.split(" ")[1] ?? "").pathname)
				.filter((path) => path.endsWith(".json") && !path.endsWith("/version.json")),
		),
	]
}

/** An image's own bitmap width, or 0 when its src did not load: a broken image still draws the box its attributes give it. */
export function imageWidth(page: Page, selector: string): Promise<number> {
	return page.locator(selector).evaluate((image) => (image as HTMLImageElement).naturalWidth)
}

/**
 * Opens a page of the hosted Demo at its path under the base path, with no `?demo=1`: the build reads the Demo snapshot
 * on its own. Waits until the snapshot is read and drawn, in the pinned font.
 */
export async function openHosted(
	page: Page,
	path: string,
	theme: "light" | "dark" = "light",
	query = "",
): Promise<void> {
	await chooseBeforeLoad(page, { theme })
	await page.goto(`${HOSTED_PREFIX}${path}${query}`)
	await settle(page, theme)
}
