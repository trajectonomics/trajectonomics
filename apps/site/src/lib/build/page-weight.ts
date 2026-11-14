import { type BuiltFile, builtPages } from "./built-files"
import type { BuildFailure } from "./failures"
import { buildFailure } from "./failures"
import { gzipSize } from "./gzip"
import { pageStylesheets } from "./page-stylesheets"
import { pageUrl } from "./page-url"
import { pageScripts } from "./program-scripts"

/** The most a page's HTML and its same-origin stylesheets may gzip to, together. */
export const PAGE_WEIGHT_BUDGET_BYTES = 50_000

/** The most program JavaScript one page may run, uncompressed. */
export const PROGRAM_JAVASCRIPT_BUDGET_BYTES = 10_000

/** The UTF-8 byte length of a text, the uncompressed figure the script budget fixes. */
function byteLength(text: string): number {
	return new TextEncoder().encode(text).length
}

/** The sum of one measure over the files, so each file adds its own bytes. */
function total(files: readonly BuiltFile[], measure: (file: BuiltFile) => number): number {
	return files.reduce((sum, file) => sum + measure(file), 0)
}

/** One failure per linked file the build did not produce. */
function missingFailures(
	code: "SCRIPT_MISSING" | "STYLESHEET_MISSING",
	paths: readonly string[],
): readonly BuildFailure[] {
	return paths.map((path) =>
		buildFailure(code, path, "the page loads it, and the build produced no such file."),
	)
}

/** One page's failures: the bytes it ships and the files it links but the build did not produce. */
function failuresOf(files: readonly BuiltFile[], page: BuiltFile): readonly BuildFailure[] {
	const stylesheets = pageStylesheets(files, page)
	const scripts = pageScripts(files, page)
	const pageBytes =
		gzipSize(page.content) + total(stylesheets.files, (file) => gzipSize(file.content))
	const inlineBytes = scripts.inline.reduce((sum, text) => sum + byteLength(text), 0)
	const scriptBytes = inlineBytes + total(scripts.files, (file) => byteLength(file.content))
	const failures = [
		...missingFailures("STYLESHEET_MISSING", stylesheets.missing),
		...missingFailures("SCRIPT_MISSING", scripts.missing),
	]
	if (pageBytes >= PAGE_WEIGHT_BUDGET_BYTES) {
		failures.push(
			buildFailure(
				"PAGE_WEIGHT_OVER_BUDGET",
				pageUrl(page.path),
				`its HTML and stylesheets gzip to ${pageBytes} bytes, not under ${PAGE_WEIGHT_BUDGET_BYTES}.`,
			),
		)
	}
	if (scriptBytes >= PROGRAM_JAVASCRIPT_BUDGET_BYTES) {
		failures.push(
			buildFailure(
				"PAGE_JAVASCRIPT_OVER_BUDGET",
				pageUrl(page.path),
				`its program JavaScript is ${scriptBytes} bytes, not under ${PROGRAM_JAVASCRIPT_BUDGET_BYTES}.`,
			),
		)
	}
	return failures
}

/** Every built page stays under the weight and script budgets, measured from the files only. */
export function checkPageWeight(files: readonly BuiltFile[]): readonly BuildFailure[] {
	return builtPages(files).flatMap((page) => failuresOf(files, page))
}
