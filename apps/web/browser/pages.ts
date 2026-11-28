import { readdirSync, statSync } from "node:fs"
import { join } from "node:path"
import { fileURLToPath } from "node:url"

const ROUTES = fileURLToPath(new URL("../src/routes", import.meta.url))

/** Every route directory under src/routes that holds a page, as the path it is served at ("/", "/tax/"). */
function routesUnder(directory: string, path: string): string[] {
	const found: string[] = []
	for (const entry of readdirSync(directory)) {
		const child = join(directory, entry)
		if (entry === "+page.svelte") found.push(path)
		else if (statSync(child).isDirectory()) found.push(...routesUnder(child, `${path}${entry}/`))
	}
	return found
}

/**
 * Every page of the Dashboard, read from the route folders, so a page added later is checked without an
 * edit here. Sorted, so the order (and the screenshot names) never depend on the file system.
 */
export const PAGES: readonly string[] = routesUnder(ROUTES, "/").sort()

/** A page's name for a test title and a file: "/" is "home", "/optimize/withdrawals/" is "optimize-withdrawals". */
export function pageName(path: string): string {
	return path === "/" ? "home" : path.replace(/^\/|\/$/g, "").replaceAll("/", "-")
}

/** Pages with Edit controls: each must show at least one that is switched off, or the hosted fence is not running. */
export const EDIT_PAGES: readonly string[] = [
	"/assets-and-debts/",
	"/expenses/",
	"/household/",
	"/income/",
	"/plans/",
	"/routing/",
	"/settings/assumptions/",
	"/settings/tax/",
]
