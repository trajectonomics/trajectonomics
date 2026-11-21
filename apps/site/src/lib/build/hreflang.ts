import { ABSOLUTE_CLEAN_URL, LANGUAGES } from "../language/languages"
import { SITE_ORIGIN } from "../site"
import type { BuiltFile } from "./built-files"
import type { BuildFailure } from "./failures"
import { buildFailure } from "./failures"
import { hreflangTarget } from "./hreflang-target"
import { elementsByTag, type HtmlElement, relTokens, type ScannedPage, scanHtml } from "./html"
import { builtHomes } from "./language-home"
import { pageUrl } from "./page-url"

/** One Language home: the built file's path, and the alternates it advertises. */
interface Home {
	readonly path: string
	readonly alternates: readonly HtmlElement[]
}

/** The alternates of one page, in document order. */
function alternatesOf(page: ScannedPage): readonly HtmlElement[] {
	return elementsByTag(page, "link").filter((link) => relTokens(link).includes("alternate"))
}

/** The href an alternate carries, for a message that names what the build wrote. */
function hrefOf(link: HtmlElement | undefined): string {
	return link?.attributes["href"] ?? "no href"
}

/** The one alternate a home carries: `x-default` at the Site's one address. */
function checkDefault(path: string, alternates: readonly HtmlElement[]): readonly BuildFailure[] {
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
	if (target?.path === "/" && (target.origin === undefined || target.origin === SITE_ORIGIN))
		return []
	return [
		buildFailure(
			"HREFLANG_TARGET",
			path,
			`advertises x-default at ${hrefOf(matching[0])}, not ${ABSOLUTE_CLEAN_URL}.`,
		),
	]
}

/** No home names a per-Language alternate: with one address there is no second URL to name. */
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

/** Every Language home advertises one `x-default` at `/`, and no per-Language alternate. */
export function checkHreflang(files: readonly BuiltFile[]): readonly BuildFailure[] {
	const homes = builtHomes(files).map(({ file }) => ({
		path: pageUrl(file.path),
		alternates: alternatesOf(scanHtml(file.content)),
	}))
	return homes.flatMap((home: Home) => [
		...checkDefault(home.path, home.alternates),
		...checkNoLanguageAlternate(home.path, home.alternates),
	])
}
