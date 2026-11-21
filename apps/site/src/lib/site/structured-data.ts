import type { Language } from "../language/language"
import { ABSOLUTE_CLEAN_URL, dictionaryFor } from "../language/languages"
import { SITE_NAME } from "../site"
import { type SoftwareApplicationNode, softwareApplication } from "./structured-data-application"
import {
	ORGANIZATION_ID,
	type OrganizationNode,
	organization,
} from "./structured-data-organization"

/** The vocabulary every block states its keys come from. */
const CONTEXT = "https://schema.org"

/** The WebSite node: the page as a site, at the Site's one address, in its Language. */
export interface WebSiteNode {
	readonly "@type": "WebSite"
	readonly "@id": string
	readonly url: string
	readonly name: string
	readonly description: string
	readonly inLanguage: Language
	readonly publisher: { readonly "@id": string }
}

/** One page's Structured data: the WebSite it is, the Organization that publishes it and traj. */
export interface StructuredData {
	readonly "@context": string
	readonly "@graph": readonly [WebSiteNode, OrganizationNode, SoftwareApplicationNode]
}

/** One Language home's WebSite: the URL it is, the Language it speaks and who publishes it. */
function website(language: Language, url: string): WebSiteNode {
	return Object.freeze({
		"@type": "WebSite",
		"@id": `${url}#website`,
		url,
		name: SITE_NAME,
		description: dictionaryFor(language).description,
		inLanguage: language,
		publisher: Object.freeze({ "@id": ORGANIZATION_ID }),
	})
}

/** The one WebSite a Language home is, the Organization that publishes it, and traj itself. */
export function structuredData(language: Language): StructuredData {
	const url = ABSOLUTE_CLEAN_URL
	return Object.freeze({
		"@context": CONTEXT,
		"@graph": Object.freeze([
			website(language, url),
			organization(),
			softwareApplication(language, url),
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
