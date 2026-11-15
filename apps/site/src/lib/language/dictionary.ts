/** Every string one Language shows. Every Language has the same keys (`GLOSSARY.md`). */
export interface Dictionary {
	/** The Language's own name, the visible label of its switcher link on the other home. */
	readonly languageName: string
	/** The short label of the current Language, the Language menu's summary. */
	readonly languageSwitchLabel: string
	/** The hero headline's static prefix; only the suffix after it changes when the cycle steps. */
	readonly heroHeadingPrefix: string
	/** The suffixes a script may show after the prefix, in order; the last one is held with no script. */
	readonly heroHeadingCycle: readonly string[]
	/** The release line above the hero headline: the stable release, naming both parts. */
	readonly heroRelease: string
	/** The release date as this Language writes it; the machine-readable date is `HERO_RELEASE_DATE`. */
	readonly heroReleaseDate: string
	readonly heroSubline: string
	readonly docsLink: string
	/** The Star menu's summary label, beside the GitHub mark. */
	readonly starMenuLabel: string
	/** The Skills card's quiet star link to the onboarding skill's repository. */
	readonly starOnboarding: string
	readonly twoPartHeading: string
	readonly skillsCardTitle: string
	readonly skillsCardBody: string
	readonly cliCardTitle: string
	readonly cliCardBody: string
	readonly cliDocsLink: string
	readonly twoPartFootnote: string
	/** The instruction under the command, always visible: the notification only confirms the copy. */
	readonly nextStep: string
	readonly copy: string
	readonly copied: string
	readonly copyFailed: string
	readonly licence: string
	readonly org: string
	readonly footerDisclaimer: string
	readonly notFoundHeading: string
	readonly notFoundBody: string
}

/** The literal a string only the owner may write carries until the owner writes it. */
export const OWNER_WRITTEN_PLACEHOLDER = "[OWNER TO WRITE]"

/** The current Language link's accessible name: its visible label, plus the full name when they differ. */
export function currentLanguageName(dictionary: Dictionary): string {
	return dictionary.languageSwitchLabel === dictionary.languageName
		? dictionary.languageName
		: `${dictionary.languageSwitchLabel} — ${dictionary.languageName}`
}
