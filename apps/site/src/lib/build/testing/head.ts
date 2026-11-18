import { shippedThemes } from "../../design/shipped-themes"
import { themePaints } from "../../design/theme-paint"
import { FALLBACK_LANGUAGE, type Language } from "../../language/language"
import { absoluteLocaleUrl, LANGUAGES, languageEntry } from "../../language/languages"
import { SITE_NAME } from "../../site"
import { structuredDataJson } from "../../site/structured-data"
import { TEST_TOKENS } from "../test-page"

/** The Social card every Language home must carry, as the build writes it. */
function cardOf(language: Language): readonly string[] {
	const dictionary = languageEntry(language).dictionary
	return [
		`<meta property="og:title" content="${dictionary.documentTitle}">`,
		`<meta property="og:description" content="${dictionary.description}">`,
		`<meta property="og:url" content="${absoluteLocaleUrl(language)}">`,
		'<meta property="og:type" content="website">',
		`<meta property="og:site_name" content="${SITE_NAME}">`,
		'<meta name="twitter:card" content="summary">',
	]
}

/** The advertised links every home carries: one per Language, plus `x-default`. */
const ALTERNATES = [
	...LANGUAGES.map(
		(entry) =>
			`<link rel="alternate" hreflang="${entry.language}" href="${absoluteLocaleUrl(entry.language)}">`,
	),
	`<link rel="alternate" hreflang="x-default" href="${absoluteLocaleUrl(FALLBACK_LANGUAGE)}">`,
].join("")

/** The browser bar paints the Themes the Site ships state, with the media query each one states. */
const PAINTS = themePaints(TEST_TOKENS, shippedThemes("production")).map(
	(paint) =>
		`<meta name="theme-color"${paint.media === undefined ? "" : ` media="${paint.media}"`} content="${paint.colour}">`,
)

/** The head one Language home must carry, as the build writes it: its title, summary and claims. */
export function headOf(language: Language): string {
	const dictionary = languageEntry(language).dictionary
	return [
		`<title>${dictionary.documentTitle}</title>`,
		`<meta name="description" content="${dictionary.description}">`,
		...PAINTS,
		...cardOf(language),
		`<link rel="canonical" href="${absoluteLocaleUrl(language)}">`,
		ALTERNATES,
		`<script type="application/ld+json">${structuredDataJson(language)}</script>`,
	].join("")
}
