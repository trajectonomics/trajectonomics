/** Every string one Language shows. Every Language has the same keys (`GLOSSARY.md`). */
export interface Dictionary {
	/** The Language's own name, the visible label of its switcher link on the other home. */
	readonly languageName: string
	/** The short label of the current Language, while the other Language keeps its own name. */
	readonly languageSwitchLabel: string
	readonly heroHeading: string
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
	readonly taxSentence: string
	readonly notFoundHeading: string
	readonly notFoundBody: string
}

/** The literal a string only the owner may write carries until the owner writes it. */
export const OWNER_WRITTEN_PLACEHOLDER = "[OWNER TO WRITE]"
