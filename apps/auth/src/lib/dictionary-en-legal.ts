import type { Dictionary } from "./dictionary"

/** The legal page titles, the footer and the root redirect. */
export const ENGLISH_LEGAL = {
	footerPrivacy: "Privacy",
	footerTerms: "Terms",
	footerContact: "Contact",
	footerSource: "Source code",
	footerLicence: "AGPL-3.0-only",

	privacyTitle: "Privacy",
	privacyDescription: "What the Trajectonomics account service keeps, why, and how to remove it.",
	termsTitle: "Terms",
	termsDescription: "The short terms for the Trajectonomics account service.",
	legalOfficialNote: "This English text is the official version.",
	legalUpdated: "Last updated",

	redirectDescription:
		"Sign in to Trajectonomics, or go to your account when you are already signed in.",
	redirectContinue: "Continue to your account",
} satisfies Partial<Dictionary>
