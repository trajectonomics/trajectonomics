import type { Language } from "../language/language"
import { openJotDictionaryFor } from "../language/openjot-dictionary"
import { ABSOLUTE_OPENJOT_URL, OPENJOT_DOWNLOAD_URL, OPENJOT_LICENCE_URL } from "../site/openjot"
import { serializeStructuredData } from "./structured-data"
import { type FaqPageNode, faqPageFrom } from "./structured-data-faq"
import {
	ORGANIZATION_ID,
	type OrganizationNode,
	organization,
} from "./structured-data-organization"

/** The vocabulary every block states its keys come from. */
const CONTEXT = "https://schema.org"

/** The category schema.org gives an app that tracks a person's money. */
const APPLICATION_CATEGORY = "FinanceApplication"

/** The platform the app installs on, as the page's own requirement line states it. */
const OPERATING_SYSTEM = "Android 7.0 or newer, 64-bit"

/** The WebSite node: the OpenJot page as a site, at its one address, in its Language. */
export interface OpenJotWebSiteNode {
	readonly "@type": "WebSite"
	readonly "@id": string
	readonly url: string
	readonly name: string
	readonly description: string
	readonly inLanguage: Language
	readonly publisher: { readonly "@id": string }
}

/** The MobileApplication node: OpenJot itself, the free Android app the page is about. */
export interface MobileApplicationNode {
	readonly "@type": "MobileApplication"
	readonly name: string
	readonly alternateName: string
	readonly applicationCategory: string
	readonly operatingSystem: string
	readonly isAccessibleForFree: true
	readonly offers: {
		readonly "@type": "Offer"
		readonly price: string
		readonly priceCurrency: string
	}
	readonly url: string
	readonly description: string
	readonly inLanguage: Language
	readonly license: string
	readonly downloadUrl: string
	readonly publisher: { readonly "@id": string }
}

/** The OpenJot page's Structured data: the page, the Organization that publishes it, the app and its FAQ. */
export interface OpenJotStructuredData {
	readonly "@context": string
	readonly "@graph": readonly [
		OpenJotWebSiteNode,
		OrganizationNode,
		MobileApplicationNode,
		FaqPageNode,
	]
}

/** The page's WebSite node: its URL, the Language it speaks and who publishes it. */
function website(language: Language): OpenJotWebSiteNode {
	return Object.freeze({
		"@type": "WebSite",
		"@id": `${ABSOLUTE_OPENJOT_URL}#website`,
		url: ABSOLUTE_OPENJOT_URL,
		name: "OpenJot",
		description: openJotDictionaryFor(language).description,
		inLanguage: language,
		publisher: Object.freeze({ "@id": ORGANIZATION_ID }),
	})
}

/** OpenJot as one Language's page describes it, from facts the page and the repository state. */
function application(language: Language): MobileApplicationNode {
	return Object.freeze({
		"@type": "MobileApplication",
		name: "OpenJot",
		alternateName: "MooJot",
		applicationCategory: APPLICATION_CATEGORY,
		operatingSystem: OPERATING_SYSTEM,
		isAccessibleForFree: true,
		offers: Object.freeze({ "@type": "Offer", price: "0", priceCurrency: "THB" }),
		url: ABSOLUTE_OPENJOT_URL,
		description: openJotDictionaryFor(language).description,
		inLanguage: language,
		license: OPENJOT_LICENCE_URL,
		downloadUrl: OPENJOT_DOWNLOAD_URL,
		publisher: Object.freeze({ "@id": ORGANIZATION_ID }),
	})
}

/** One Language's OpenJot page: its WebSite, the Organization, the app, and the FAQ the page shows. */
export function openJotStructuredData(language: Language): OpenJotStructuredData {
	const dictionary = openJotDictionaryFor(language)
	return Object.freeze({
		"@context": CONTEXT,
		"@graph": Object.freeze([
			website(language),
			organization(),
			application(language),
			faqPageFrom(language, ABSOLUTE_OPENJOT_URL, dictionary.faqQuestions, dictionary.faqAnswers),
		] as const),
	})
}

/** One Language's OpenJot page's Structured data, serialized for the `<script>` element that carries it. */
export function openJotStructuredDataJson(language: Language): string {
	return serializeStructuredData(openJotStructuredData(language))
}
