import type { BuiltFile } from "./built-files"
import { fileAt } from "./built-files"
import type { BuildFailure } from "./failures"
import { buildFailure } from "./failures"

/** The Site serves the Dashboard's hosted Demo under this prefix, as static assets ([ADR 0031]). */
export const DEMO_PREFIX = "demo/"

/** The Demo's home, which the Site must always build. */
export const DEMO_HOME = `${DEMO_PREFIX}index.html`

/** The Workers Static Assets headers file at the assets root. */
export const HEADERS_FILE = "_headers"

/** The one pattern the Site's `_headers` file carries: the hosted Demo, and nothing else. */
export const DEMO_HEADER_PATTERN = "/demo/*"

/** Whether a built file belongs to the hosted Demo rather than to the Site's own pages. */
export function isDemoFile(path: string): boolean {
	return path.startsWith(DEMO_PREFIX)
}

/** The Demo's built pages: the files the Demo's own rules judge. */
export function demoPages(files: readonly BuiltFile[]): readonly BuiltFile[] {
	return files.filter((file) => isDemoFile(file.path) && file.path.endsWith(".html"))
}

/** The Demo's home is built, because the Site links it from its own home. */
export function checkDemoHome(files: readonly BuiltFile[]): readonly BuildFailure[] {
	if (fileAt(files, DEMO_HOME) !== undefined) return []
	return [
		buildFailure(
			"DEMO_HOME_MISSING",
			DEMO_HOME,
			"the hosted Demo built no home; the Site's link to /demo/ would 404.",
		),
	]
}
