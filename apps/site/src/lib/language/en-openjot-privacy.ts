import type { OpenJotPrivacyWords } from "./openjot-dictionary"

/**
 * The English words of the OpenJot page's Privacy section, kept verbatim from the app's own landing
 * page: the port claims exactly what that page claimed, and nothing more (ADR 0032).
 */
export const ENGLISH_OPENJOT_PRIVACY: OpenJotPrivacyWords = Object.freeze({
	privacyEyebrow: "Privacy",
	privacyHeading: "Your money is your business",
	privacyTitles: Object.freeze([
		"No account",
		"Stays on your phone",
		"Only slip albums",
		"No ads, no tracking unless you say yes",
	] as const),
	privacyCopies: Object.freeze([
		"No sign-up and no log-in. Open it and go.",
		"Your ledger is stored on your phone. There's no OpenJot server to send it to.",
		"By default it never opens your camera photos, screenshots or downloads.",
		"OpenJot sends no usage data of its own unless you choose to share anonymous stats, and never your records or amounts. Google's ML Kit, which reads the English text on slips, sends Google its own usage stats, but not your photos or what they say. This website uses cookies only if you allow them.",
	] as const),
	privacyPolicyLink: "Privacy policy",
	termsLink: "Terms of service",
	privacyContactLink: "Privacy contact",
})
