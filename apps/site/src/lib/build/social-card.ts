import type { Language } from "../language/language"
import {
	ABSOLUTE_CLEAN_URL,
	dictionaryFor,
	languageEntry,
	otherLanguages,
} from "../language/languages"
import { SITE_NAME } from "../site"
import { SHARE_IMAGE_HEIGHT, SHARE_IMAGE_WIDTH } from "../social/layout"
import { absoluteShareImageUrl, SHARE_IMAGE_TYPE, shareImageAlt } from "../social/share-advert"
import type { BuiltFile } from "./built-files"
import type { BuildFailure } from "./failures"
import { buildFailure } from "./failures"
import { elementsByTag, type ScannedPage, scanHtml } from "./html"
import { unescapeText } from "./html-tag"
import { builtHomes } from "./language-home"
import { pageUrl } from "./page-url"

/** The card kind: `summary_large_image`, because a 1200 × 630 share image ships with the page. */
const CARD_KIND = "summary_large_image"

/** One property a Social card carries: the attribute that names it, and the value the page gives it. */
interface CardProperty {
	readonly attribute: "property" | "name"
	readonly key: string
	readonly expected: string
}

/** The card one Language home must carry, property by property. */
function cardOf(language: Language): readonly CardProperty[] {
	const dictionary = dictionaryFor(language)
	const image = absoluteShareImageUrl(language)
	const entry = languageEntry(language)
	return [
		{ attribute: "property", key: "og:title", expected: dictionary.documentTitle },
		{ attribute: "property", key: "og:description", expected: dictionary.description },
		{ attribute: "property", key: "og:url", expected: ABSOLUTE_CLEAN_URL },
		{ attribute: "property", key: "og:locale", expected: entry.locale },
		...otherLanguages(language).map((other) => ({
			attribute: "property" as const,
			key: "og:locale:alternate",
			expected: other.locale,
		})),
		{ attribute: "property", key: "og:type", expected: "website" },
		{ attribute: "property", key: "og:site_name", expected: SITE_NAME },
		{ attribute: "property", key: "og:image", expected: image },
		{ attribute: "property", key: "og:image:width", expected: String(SHARE_IMAGE_WIDTH) },
		{ attribute: "property", key: "og:image:height", expected: String(SHARE_IMAGE_HEIGHT) },
		{ attribute: "property", key: "og:image:type", expected: SHARE_IMAGE_TYPE },
		{ attribute: "property", key: "og:image:alt", expected: shareImageAlt(dictionary) },
		{ attribute: "name", key: "twitter:card", expected: CARD_KIND },
		{ attribute: "name", key: "twitter:image", expected: image },
	]
}

/**
 * The values a page gives one property, in document order, its escaping undone. The key is matched
 * exactly: Open Graph and X read `og:` and `twitter:` as written, so `OG:Title` is not `og:title`.
 */
function valuesOf(page: ScannedPage, property: CardProperty): readonly string[] {
	return elementsByTag(page, "meta")
		.filter((meta) => meta.attributes[property.attribute] === property.key)
		.map((meta) => unescapeText(meta.attributes["content"] ?? ""))
}

/** One property is present once, at the value the page must state under it. */
function checkProperty(
	path: string,
	page: ScannedPage,
	property: CardProperty,
): readonly BuildFailure[] {
	const values = valuesOf(page, property)
	const [value] = values
	if (value === undefined) {
		return [
			buildFailure(
				"SOCIAL_CARD_MISSING",
				path,
				`carries no ${property.attribute} "${property.key}", so a share renders without it.`,
			),
		]
	}
	if (values.length > 1) {
		return [
			buildFailure(
				"SOCIAL_CARD_DUPLICATE",
				path,
				`carries ${values.length} metas for "${property.key}", not one.`,
			),
		]
	}
	if (value === property.expected) return []
	return [
		buildFailure(
			"SOCIAL_CARD_WRONG",
			path,
			`states "${value}" as its ${property.key}, not "${property.expected}".`,
		),
	]
}

/** Every Language home carries one Social card, and every property of it agrees with the page. */
export function checkSocialCard(files: readonly BuiltFile[]): readonly BuildFailure[] {
	return builtHomes(files).flatMap(({ entry, file }) => {
		const page = scanHtml(file.content)
		return cardOf(entry.language).flatMap((property) =>
			checkProperty(pageUrl(file.path), page, property),
		)
	})
}
