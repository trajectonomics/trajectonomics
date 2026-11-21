import {
	APPLE_TOUCH_ICON_URL,
	GITHUB_CLI_URL,
	GITHUB_ORG_URL,
	GITHUB_SKILLS_URL,
	SITE_NAME,
	SITE_ORIGIN,
} from "../site"

/** The `@id` the Organization is published under, and the publisher every other node points at. */
export const ORGANIZATION_ID = `${SITE_ORIGIN}/#organization`

/** The pages and repositories that identify the Organization, which is what `sameAs` is for. */
const SAME_AS: readonly string[] = Object.freeze([
	GITHUB_ORG_URL,
	GITHUB_CLI_URL,
	GITHUB_SKILLS_URL,
])

/** The Organization node: who publishes the Site, where it publishes and the mark it uses. */
export interface OrganizationNode {
	readonly "@type": "Organization"
	readonly "@id": string
	readonly name: string
	readonly url: string
	readonly logo: string
	readonly sameAs: readonly string[]
}

/** The Organization that publishes every page of the Site. */
export function organization(): OrganizationNode {
	return Object.freeze({
		"@type": "Organization",
		"@id": ORGANIZATION_ID,
		name: SITE_NAME,
		url: SITE_ORIGIN,
		logo: APPLE_TOUCH_ICON_URL,
		sameAs: SAME_AS,
	})
}
