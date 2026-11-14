/** Every string one Language shows. Every Language has the same keys (`GLOSSARY.md`). */
export interface Dictionary {
	/** The Language's own name, the visible label of its switcher link on the other home. */
	readonly languageName: string
	/** The short label of the current Language, while the other Language keeps its own name. */
	readonly languageSwitchLabel: string
	/** The hero headline with no script, and the line the cycle ends on and holds. */
	readonly heroHeading: string
	/** The headlines a script may show before it holds `heroHeading`, in order. */
	readonly heroHeadingCycle: readonly string[]
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
