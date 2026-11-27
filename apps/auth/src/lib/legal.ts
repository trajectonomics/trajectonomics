/**
 * The one address the privacy page names. It is a placeholder until the owner confirms the mailbox
 * that will be monitored.
 */
// TODO(owner): confirm privacy@trajectonomics.com is the address that will be read and answered.
export const PRIVACY_CONTACT = "privacy@trajectonomics.com"

/** One link a legal section shows after its prose. */
export interface LegalLink {
	readonly text: string
	readonly href: string
}

/** One heading and its prose, plus an optional list and link that belong to it. */
export interface LegalSection {
	readonly heading: string
	readonly body: readonly string[]
	readonly items?: readonly string[]
	readonly link?: LegalLink
}

/** A legal page's sections and the date its text last changed. */
export interface LegalContent {
	readonly updated: string
	readonly sections: readonly LegalSection[]
}
