import { FALLBACK_LANGUAGE } from "../language/language"
import { absoluteLocaleUrl, LANGUAGES } from "../language/languages"
import type { BuiltFile } from "./built-files"
import type { BuildFailure, BuildFailureCode } from "./failures"
import { buildFailure } from "./failures"
import { elementsByTag, type HtmlElement, scanHtml } from "./html"
import { builtHomes } from "./language-home"

/** One link a home must advertise: an absolute `hreflang` for a Language, or the fallback. */
interface AdvertisedLink {
	readonly hreflang: string
	readonly href: string
	readonly missing: BuildFailureCode
	readonly wrongUrl: BuildFailureCode
}

/** Both Languages and the fallback, so a crawler indexes every home under its own URL. */
const ADVERTISED: readonly AdvertisedLink[] = Object.freeze([
	...LANGUAGES.map((entry) => ({
		hreflang: entry.language,
		href: absoluteLocaleUrl(entry.language),
		missing: "HREFLANG_MISSING" as const,
		wrongUrl: "HREFLANG_WRONG_URL" as const,
	})),
	{
		hreflang: "x-default",
		href: absoluteLocaleUrl(FALLBACK_LANGUAGE),
		missing: "X_DEFAULT_MISSING" as const,
		wrongUrl: "X_DEFAULT_WRONG_URL" as const,
	},
])

/** Every `<link rel="alternate">` a page carries, by the Language it names. */
function alternates(links: readonly HtmlElement[]): readonly HtmlElement[] {
	return links.filter((link) => /\balternate\b/i.test(link.attributes["rel"] ?? ""))
}

/** Every failure a home meets for one advertised link. */
function checkLink(file: BuiltFile, links: readonly HtmlElement[], link: AdvertisedLink) {
	const found = alternates(links).find((link_) => link_.attributes["hreflang"] === link.hreflang)
	if (found === undefined) {
		return [buildFailure(link.missing, file.path, `advertises no ${link.hreflang} alternate.`)]
	}
	const href = found.attributes["href"]
	if (href === link.href) return []
	return [
		buildFailure(
			link.wrongUrl,
			file.path,
			`advertises ${link.hreflang} at ${href ?? "no href"}, not at ${link.href}.`,
		),
	]
}

/** Every home advertises every Language, and the fallback as `x-default`, at absolute URLs. */
export function checkAdvertisedLinks(files: readonly BuiltFile[]): readonly BuildFailure[] {
	return builtHomes(files).flatMap(({ file }) => {
		const links = elementsByTag(scanHtml(file.content), "link")
		return ADVERTISED.flatMap((link) => checkLink(file, links, link))
	})
}
