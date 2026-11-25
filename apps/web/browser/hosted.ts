import type { Page } from "@playwright/test"
import { HOSTED_ORIGIN, HOSTED_PREFIX } from "./base-url"
import { chooseBeforeLoad, settle } from "./demo"

/** The one file the hosted Demo may read besides its own pages and assets: the Demo snapshot, under the base path. */
export const DEMO_SNAPSHOT = `${HOSTED_PREFIX}/demo/snapshot.json`

/** Every request a page makes, as Playwright's log has it. */
export interface Requests {
	/** `METHOD url` for each request, in order. */
	readonly seen: string[]
}

/** Starts the log. Call it before `openHosted`, so the first request is in it. */
export function logRequests(page: Page): Requests {
	const seen: string[] = []
	page.on("request", (request) => seen.push(`${request.method()} ${request.url()}`))
	return { seen }
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

/**
 * Opens a page of the hosted Demo at its path under the base path, with no `?demo=1`: the build reads the Demo snapshot
 * on its own. Waits until the snapshot is read and drawn, in the pinned font.
 */
export async function openHosted(
	page: Page,
	path: string,
	theme: "light" | "dark" = "light",
): Promise<void> {
	await chooseBeforeLoad(page, { theme })
	await page.goto(`${HOSTED_PREFIX}${path}`)
	await settle(page, theme)
}
