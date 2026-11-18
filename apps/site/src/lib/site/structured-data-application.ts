import type { Language } from "../language/language"
import { dictionaryFor } from "../language/languages"
import { CLI_NAME, GITHUB_CLI_URL, SKILLS_LICENCE_URL } from "../site"
import { ORGANIZATION_ID } from "./structured-data-organization"

/** The category schema.org gives a program that projects a person's money. */
const APPLICATION_CATEGORY = "FinanceApplication"

/** The platforms the CLI's README installs on: macOS and Linux by script, Windows by PowerShell. */
const OPERATING_SYSTEM = "macOS, Linux, Windows"

/** The SoftwareApplication node: traj itself, the free program the page is about. */
export interface SoftwareApplicationNode {
	readonly "@type": "SoftwareApplication"
	readonly name: string
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
	readonly codeRepository: string
	readonly publisher: { readonly "@id": string }
}

/** traj as one Language's page describes it, from the facts the page and the repository state. */
export function softwareApplication(language: Language, url: string): SoftwareApplicationNode {
	return Object.freeze({
		"@type": "SoftwareApplication",
		name: CLI_NAME,
		applicationCategory: APPLICATION_CATEGORY,
		operatingSystem: OPERATING_SYSTEM,
		isAccessibleForFree: true,
		offers: Object.freeze({ "@type": "Offer", price: "0", priceCurrency: "USD" }),
		url,
		description: dictionaryFor(language).description,
		inLanguage: language,
		license: SKILLS_LICENCE_URL,
		codeRepository: GITHUB_CLI_URL,
		publisher: Object.freeze({ "@id": ORGANIZATION_ID }),
	})
}
