import type { Language } from "../language/language"
import { absoluteLocaleUrl, dictionaryFor } from "../language/languages"
import { SITE_NAME, SITE_ORIGIN } from "../site"

/** The vocabulary every block states its keys come from. */
const CONTEXT = "https://schema.org"

/** The `@id` the Organization is published under, and the WebSite's publisher points at. */
const ORGANIZATION_ID = `${SITE_ORIGIN}/#organization`

/** The WebSite node: the page as a site, at its Locale URL, in its Language. */
export interface WebSiteNode {
	readonly "@type": "WebSite"
	readonly "@id": string
	readonly url: string
	readonly name: string
	readonly description: string
	readonly inLanguage: Language
	readonly publisher: { readonly "@id": string }
}

/** The Organization node: who publishes the Site. */
export interface OrganizationNode {
	readonly "@type": "Organization"
	readonly "@id": string
	readonly name: string
	readonly url: string
}

/** One page's Structured data: the WebSite it is, and the Organization that publishes it. */
export interface StructuredData {
	readonly "@context": string
	readonly "@graph": readonly [WebSiteNode, OrganizationNode]
}

/** The one WebSite a Language home is, and the Organization that publishes it. */
export function structuredData(language: Language): StructuredData {
	const url = absoluteLocaleUrl(language)
	return Object.freeze({
		"@context": CONTEXT,
		"@graph": Object.freeze([
			Object.freeze({
				"@type": "WebSite" as const,
				"@id": `${url}#website`,
				url,
				name: SITE_NAME,
				description: dictionaryFor(language).description,
				inLanguage: language,
				publisher: Object.freeze({ "@id": ORGANIZATION_ID }),
			}),
			Object.freeze({
				"@type": "Organization" as const,
				"@id": ORGANIZATION_ID,
				name: SITE_NAME,
				url: SITE_ORIGIN,
			}),
		] as const),
	})
}

/** The block as a `<script>` body, with every `<` escaped so no text can close the element. */
export function serializeStructuredData(block: StructuredData): string {
	return JSON.stringify(block).replace(/</g, "\\u003c")
}

/** One Language home's Structured data, serialized for the `<script>` element that carries it. */
export function structuredDataJson(language: Language): string {
	return serializeStructuredData(structuredData(language))
}
