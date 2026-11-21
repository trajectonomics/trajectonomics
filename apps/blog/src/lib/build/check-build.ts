import { type BuiltFile, type Failure, failure } from "./failures"
import { canonicalOf, isNoindex, linkTargets, setsSecurityPolicy, titleOf } from "./html"

/** Every built file lives under this folder, because the router forwards only `/blog`. */
const BASE = "blog/"

/** The router's preload path, which a microfrontend must never serve. */
const PRELOAD_FILE = "__mf-preload.js"

/** The blog's own Not-found page, which the Worker's `404-page` handling finds for a miss. */
const NOT_FOUND_PAGE = "blog/404.html"

/** The rules every built file meets, whatever kind it is. */
function checkFile(file: BuiltFile): Failure[] {
	const failures: Failure[] = []
	if (!file.path.startsWith(BASE)) {
		failures.push(
			failure("file-outside-base", file.path, `is outside ${BASE}, which no request reaches`),
		)
	}
	if (file.path.split("/").at(-1) === PRELOAD_FILE) {
		failures.push(failure("preload-path-served", file.path, `serves the router's ${PRELOAD_FILE}`))
	}
	if (file.path.endsWith("_headers") && /content-security-policy/i.test(file.text ?? "")) {
		failures.push(
			failure("security-policy-set", file.path, "sets a content security policy header"),
		)
	}
	return failures
}

/** The rules every built page meets: its head and the shell around its body. */
function checkPage(path: string, html: string): Failure[] {
	const failures: Failure[] = []
	if (titleOf(html) === undefined) {
		failures.push(failure("page-title-missing", path, "has no <title>"))
	}
	if (!isNoindex(html) && canonicalOf(html) === undefined) {
		failures.push(failure("page-canonical-missing", path, "is indexable and names no canonical"))
	}
	if (setsSecurityPolicy(html)) {
		failures.push(failure("security-policy-set", path, "sets a content security policy meta tag"))
	}
	const targets = linkTargets(html)
	if (!targets.includes("/")) {
		failures.push(failure("shell-home-link-missing", path, "has no link to the Site Home /"))
	}
	if (!targets.includes("/blog/")) {
		failures.push(failure("shell-blog-link-missing", path, "has no link to the blog's front page"))
	}
	if (!/<footer\b/i.test(html)) {
		failures.push(failure("shell-footer-missing", path, "has no footer"))
	}
	return failures
}

/** Every rule the built blog breaks, in file order; an empty list means the build may deploy. */
export function checkBuild(files: readonly BuiltFile[]): readonly Failure[] {
	const failures = files.flatMap((file) => [
		...checkFile(file),
		...(file.path.endsWith(".html") ? checkPage(file.path, file.text ?? "") : []),
	])
	if (!files.some((file) => file.path === NOT_FOUND_PAGE)) {
		failures.push(
			failure("not-found-page-missing", NOT_FOUND_PAGE, "is missing, so a miss is bare"),
		)
	}
	return Object.freeze(failures)
}
