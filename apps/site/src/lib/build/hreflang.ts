import type { LanguagePage } from "../language/language-pages"
import { LANGUAGES } from "../language/languages"
import { SITE_ORIGIN } from "../site"
import type { BuiltFile } from "./built-files"
import type { BuildFailure } from "./failures"
import { buildFailure } from "./failures"
import { hreflangTarget } from "./hreflang-target"
import { elementsByTag, type HtmlElement, relTokens, type ScannedPage, scanHtml } from "./html"
import { builtLanguagePages } from "./language-pages"
import { pageUrl } from "./page-url"

/** The alternates of one page, in document order. */
function alternatesOf(page: ScannedPage): readonly HtmlElement[] {
	return elementsByTag(page, "link").filter((link) => relTokens(link).includes("alternate"))
}

/** The href an alternate carries, for a message that names what the build wrote. */
function hrefOf(link: HtmlElement | undefined): string {
	return link?.attributes["href"] ?? "no href"
}

/** The one alternate a page carries: `x-default` at its own address. */
function checkDefault(
	path: string,
	alternates: readonly HtmlElement[],
	page: LanguagePage,
): readonly BuildFailure[] {
	const matching = alternates.filter((link) => link.attributes["hreflang"] === "x-default")
	if (matching.length === 0) {
		return [buildFailure("HREFLANG_MISSING", path, "advertises no x-default alternate.")]
	}
	if (matching.length > 1) {
		return [
			buildFailure(
				"HREFLANG_DUPLICATE",
				path,
				`advertises ${matching.length} x-default alternates, not one.`,
			),
		]
	}
	const target = hreflangTarget(matching[0]?.attributes["href"])
	if (
		target?.path === page.address &&
		(target.origin === undefined || target.origin === SITE_ORIGIN)
	)
		return []
	return [
		buildFailure(
			"HREFLANG_TARGET",
			path,
			`advertises x-default at ${hrefOf(matching[0])}, not ${page.absoluteUrl}.`,
		),
	]
}

/** No page names a per-Language alternate: with one address there is no second URL to name. */
function checkNoLanguageAlternate(
	path: string,
	alternates: readonly HtmlElement[],
): readonly BuildFailure[] {
	return LANGUAGES.filter((entry) =>
		alternates.some((link) => link.attributes["hreflang"] === entry.language),
	).map((entry) =>
		buildFailure(
			"HREFLANG_LANGUAGE_ALTERNATE",
			path,
			`advertises a ${entry.language} alternate, but the Site has one address and no second Language URL.`,
		),
	)
}

/** Every page advertises one `x-default` at its own address, and no per-Language alternate. */
export function checkHreflang(files: readonly BuiltFile[]): readonly BuildFailure[] {
	return builtLanguagePages(files).flatMap(({ page, file }) => {
		const path = pageUrl(file.path)
		const alternates = alternatesOf(scanHtml(file.content))
		return [...checkDefault(path, alternates, page), ...checkNoLanguageAlternate(path, alternates)]
	})
}
