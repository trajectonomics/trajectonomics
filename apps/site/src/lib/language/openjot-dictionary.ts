import { ENGLISH_OPENJOT } from "./en-openjot"
import type { Language } from "./language"
import { THAI_OPENJOT } from "./th-openjot"

/** Every string the OpenJot page shows, the same keys in every Language. */
export interface OpenJotDictionary {
	/** The document title: what a tab and a search result show. */
	readonly documentTitle: string
	/** One line of summary, for a search result and a shared link. */
	readonly description: string
	/** The hero's mono label. */
	readonly heroEyebrow: string
	/** The headline up to its accent: the plain run before the highlighted words. */
	readonly heroHeadingPrefix: string
	/** The words of the headline the accent colour highlights. */
	readonly heroHeadingAccent: string
	/** The paragraph under the headline: what the app does, and where the data stays. */
	readonly heroLede: string
	readonly downloadCta: string
	readonly installCta: string
	/** The file and platform line under the controls. */
	readonly requirement: string
	/** The link to the app's releases and their checksums. */
	readonly releasesLink: string
	/** The in-app browser note above the hero: how to leave Instagram, LINE or Facebook. */
	readonly inAppTitle: string
	readonly inAppText: string
	readonly screensEyebrow: string
	readonly screensHeading: string
	/** One caption per screenshot, in the order the page shows them. */
	readonly screenCaptions: readonly string[]
	/** One description per screenshot, in the same order, for a reader who cannot see it. */
	readonly screenAlts: readonly string[]
	readonly screensNote: string
	readonly featuresEyebrow: string
	readonly featuresHeading: string
	/** Six feature titles, in order; each is plain text, not a heading (ADR 0012). */
	readonly featureTitles: readonly string[]
	/** Six feature sentences, one per title and in the same order. */
	readonly featureCopies: readonly string[]
	readonly privacyEyebrow: string
	readonly privacyHeading: string
	/** Four privacy claims' titles, in the order the page lists them. */
	readonly privacyTitles: readonly string[]
	/** One paragraph per claim, in the same order: the claim's own words, never more. */
	readonly privacyCopies: readonly string[]
	/** The link to the app's privacy policy. */
	readonly privacyPolicyLink: string
	/** The link to the app's terms of service. */
	readonly termsLink: string
	/** The link that writes to the privacy contact. */
	readonly privacyContactLink: string
	readonly installEyebrow: string
	readonly installHeading: string
	readonly installLede: string
	/** Three step titles, in the order the page lists the steps. */
	readonly stepTitles: readonly string[]
	/** One sentence per step, in the same order. */
	readonly stepCopies: readonly string[]
	/** The note under the second step, for a Play Protect warning. */
	readonly installTip: string
	readonly updateNote: string
	/** The line before the checksum link and the fingerprint. */
	readonly checkFileText: string
	/** The link text of the checksum file. */
	readonly checksumsLink: string
	/** The warning after the fingerprint. */
	readonly checkFileWarning: string
	readonly faqEyebrow: string
	readonly faqHeading: string
	readonly faqQuestions: readonly string[]
	readonly faqAnswers: readonly string[]
	readonly closingHeading: string
	readonly closingLede: string
	/** The quiet link under the closing button. */
	readonly ossLink: string
}

/** The FAQ's words, which each Language's own file carries. */
export type OpenJotFaqWords = Pick<
	OpenJotDictionary,
	"faqEyebrow" | "faqHeading" | "faqQuestions" | "faqAnswers"
>

/** The Privacy section's words: the ported claims, and the three links under them. */
export type OpenJotPrivacyWords = Pick<
	OpenJotDictionary,
	| "privacyEyebrow"
	| "privacyHeading"
	| "privacyTitles"
	| "privacyCopies"
	| "privacyPolicyLink"
	| "termsLink"
	| "privacyContactLink"
>

/** The OpenJot page's build path and words for one Language. */
export interface OpenJotLanguageEntry {
	readonly language: Language
	/** The Language's build path under `openjot/`, relative to the assets root. */
	readonly buildPath: string
	readonly dictionary: OpenJotDictionary
}

/** Every Language the OpenJot page is built in. A further Language is one file and one entry here. */
export const OPENJOT_LANGUAGES: readonly OpenJotLanguageEntry[] = Object.freeze([
	THAI_OPENJOT,
	ENGLISH_OPENJOT,
])

/** The config entry of one Language's OpenJot page. */
export function openJotEntry(language: Language): OpenJotLanguageEntry {
	const entry = OPENJOT_LANGUAGES.find((candidate) => candidate.language === language)
	if (entry === undefined) throw new Error(`the OpenJot page has no ${language} entry`)
	return entry
}

/** The OpenJot page's words for one Language. */
export function openJotDictionaryFor(language: Language): OpenJotDictionary {
	return openJotEntry(language).dictionary
}

/** The built file the OpenJot page is written to, relative to the assets root. */
export function openJotBuildFile(language: Language): string {
	const { buildPath } = openJotEntry(language)
	return buildPath === "" ? "openjot/index.html" : `${buildPath}/openjot/index.html`
}

/** The asset path the Worker fetches the OpenJot page from, relative to its origin. */
export function openJotAssetPath(language: Language): string {
	const { buildPath } = openJotEntry(language)
	return buildPath === "" ? "/openjot/" : `/${buildPath}/openjot/`
}
