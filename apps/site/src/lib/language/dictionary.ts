/** Every string one Language shows. Every Language has the same keys (`GLOSSARY.md`). */
export interface Dictionary {
	readonly languageName: string
	readonly heroHeading: string
	readonly heroSubline: string
	readonly installHeading: string
	readonly docsLink: string
	readonly githubLink: string
	readonly starOnGitHub: string
	readonly copy: string
	readonly copied: string
	readonly footerDisclaimer: string
	readonly taxSentence: string
	readonly notFoundHeading: string
	readonly notFoundBody: string
}

/** The literal a string only the owner may write carries until the owner writes it. */
export const OWNER_WRITTEN_PLACEHOLDER = "[OWNER TO WRITE]"

/** The strings only the owner may write, so no agent invents money or tax meaning. */
export const OWNER_WRITTEN_KEYS = [
	"heroHeading",
	"heroSubline",
	"footerDisclaimer",
	"taxSentence",
] as const satisfies readonly (keyof Dictionary)[]
