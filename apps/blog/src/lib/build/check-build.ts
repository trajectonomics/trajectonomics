import { SITE_HOME_URL } from "../site"
import { type BuiltFile, type Failure, failure } from "./failures"
import { canonicalOf, images, isNoindex, linkTargets, titleOf } from "./html"

/** The blog's own Not-found Page, which the Worker's `404-page` handling finds for a miss. */
const NOT_FOUND_PAGE = "404.html"

/** Every image the page shows is a built file, and says what it shows. */
function checkImages(path: string, html: string, built: ReadonlySet<string>): Failure[] {
	return images(html).flatMap(({ src, alt }) => {
		const failures: Failure[] = []
		if (src.startsWith("/") && !built.has(src.slice(1))) {
			failures.push(failure("page-image-missing", path, `shows ${src}, which the build lacks`))
		}
		if (alt === undefined) {
			failures.push(failure("page-image-alt-missing", path, `shows ${src} with no alt text`))
		}
		return failures
	})
}

/** The rules every built page meets: its head and the Shell around its body. */
function checkPage(path: string, html: string): Failure[] {
	const failures: Failure[] = []
	if (titleOf(html) === undefined) {
		failures.push(failure("page-title-missing", path, "has no <title>"))
	}
	if (!isNoindex(html) && canonicalOf(html) === undefined) {
		failures.push(failure("page-canonical-missing", path, "is indexable and names no canonical"))
	}
	const targets = linkTargets(html)
	if (!targets.includes(SITE_HOME_URL)) {
		failures.push(failure("shell-home-link-missing", path, `has no link to ${SITE_HOME_URL}`))
	}
	if (!targets.includes("/")) {
		failures.push(failure("shell-blog-link-missing", path, "has no link to the blog's front page"))
	}
	if (!/<footer\b/i.test(html)) {
		failures.push(failure("shell-footer-missing", path, "has no footer"))
	}
	return failures
}

/** Every rule the built blog breaks, in file order; an empty list means the build may deploy. */
export function checkBuild(files: readonly BuiltFile[]): readonly Failure[] {
	const built = new Set(files.map((file) => file.path))
	const failures = files
		.filter((file) => file.path.endsWith(".html"))
		.flatMap((file) => [
			...checkPage(file.path, file.text ?? ""),
			...checkImages(file.path, file.text ?? "", built),
		])
	if (!built.has(NOT_FOUND_PAGE)) {
		failures.push(
			failure("not-found-page-missing", NOT_FOUND_PAGE, "is missing, so a miss is bare"),
		)
	}
	return Object.freeze(failures)
}
