/** Every string one Language shows. Every Language has the same keys (`GLOSSARY.md`). */
export interface Dictionary {
	/** The Language's own name, the visible label of its switcher link on the other home. */
	readonly languageName: string
	/** The short label of the current Language, while the other Language keeps its own name. */
	readonly languageSwitchLabel: string
	/** The hero headline's static prefix; only the suffix after it changes when the cycle steps. */
	readonly heroHeadingPrefix: string
	/** The suffixes a script may show after the prefix, in order; the last one is held with no script. */
	readonly heroHeadingCycle: readonly string[]
	/** The small uppercase line above the hero headline, marked with the kicker colour. */
	readonly heroEyebrow: string
	readonly heroSubline: string
	readonly docsLink: string
	readonly githubLink: string
	readonly starOnGitHub: string
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
