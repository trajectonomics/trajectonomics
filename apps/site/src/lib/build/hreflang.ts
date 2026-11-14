import type { Language } from "../language/language"
import { LANGUAGES, localeUrl } from "../language/languages"
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

/** One Language's alternate is present, single, and points at that Language's Locale URL. */
function checkLanguage(
	path: string,
	alternates: readonly HtmlElement[],
	language: Language,
): readonly BuildFailure[] {
	const matching = alternates.filter((link) => link.attributes["hreflang"] === language)
	const href = localeUrl(language)
	if (matching.length === 0) {
		return [buildFailure("HREFLANG_MISSING", path, `advertises no ${language} alternate.`)]
	}
	if (matching.length > 1) {
		return [
			buildFailure(
				"HREFLANG_DUPLICATE",
				path,
				`advertises ${matching.length} ${language} alternates, not one.`,
			),
		]
	}
	if (hreflangTarget(matching[0]?.attributes["href"])?.path === href) return []
	return [
		buildFailure(
			"HREFLANG_TARGET",
			path,
			`advertises ${language} at ${hrefOf(matching[0])}, not ${href}.`,
		),
	]
}

/** Every absolute alternate, on every Language home, names one origin. */
function checkOrigins(homes: readonly Home[]): readonly BuildFailure[] {
	const origins = new Set(
		homes.flatMap((home) =>
			home.alternates.flatMap((link) => {
				const origin = hreflangTarget(link.attributes["href"])?.origin
				return origin === undefined ? [] : [origin]
			}),
		),
	)
	if (origins.size <= 1) return []
	const names = [...origins].join(", ")
	return homes
		.filter((home) =>
			home.alternates.some((link) => hreflangTarget(link.attributes["href"])?.origin !== undefined),
		)
		.map((home) =>
			buildFailure("HREFLANG_TARGET", home.path, `absolute alternates split across: ${names}.`),
		)
}

/** Every Language home advertises both Languages at matching Locale URLs. */
export function checkHreflang(files: readonly BuiltFile[]): readonly BuildFailure[] {
	const homes = builtHomes(files).map(({ file }) => ({
		path: pageUrl(file.path),
		alternates: alternatesOf(scanHtml(file.content)),
	}))
	return [
		...homes.flatMap((home) =>
			LANGUAGES.flatMap((entry) => checkLanguage(home.path, home.alternates, entry.language)),
		),
		...checkOrigins(homes),
	]
}
