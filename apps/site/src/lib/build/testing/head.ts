import { shippedThemes } from "../../design/shipped-themes"
import { themePaints } from "../../design/theme-paint"
import { FALLBACK_LANGUAGE, type Language } from "../../language/language"
import { absoluteLocaleUrl, LANGUAGES, languageEntry } from "../../language/languages"
import { SITE_NAME } from "../../site"
import { structuredDataJson } from "../../site/structured-data"
import { SHARE_IMAGE_HEIGHT, SHARE_IMAGE_WIDTH } from "../../social/layout"
import { absoluteShareImageUrl, shareImageAlt } from "../../social/share-advert"
import { TEST_TOKENS } from "../test-page"

/** The Social card every Language home must carry, as the build writes it. */
function cardOf(language: Language): readonly string[] {
	const dictionary = languageEntry(language).dictionary
	const image = absoluteShareImageUrl(language)
	return [
		`<meta property="og:title" content="${dictionary.documentTitle}">`,
		`<meta property="og:description" content="${dictionary.description}">`,
		`<meta property="og:url" content="${absoluteLocaleUrl(language)}">`,
		'<meta property="og:type" content="website">',
		`<meta property="og:site_name" content="${SITE_NAME}">`,
		`<meta property="og:image" content="${image}">`,
		`<meta property="og:image:width" content="${SHARE_IMAGE_WIDTH}">`,
		`<meta property="og:image:height" content="${SHARE_IMAGE_HEIGHT}">`,
		'<meta property="og:image:type" content="image/png">',
		`<meta property="og:image:alt" content="${shareImageAlt(dictionary)}">`,
		'<meta name="twitter:card" content="summary_large_image">',
		`<meta name="twitter:image" content="${image}">`,
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
