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
	/** The stable release's version, the first run of the pill above the headline. */
	readonly heroVersion: string
	/** The licence note beside the version: the pill's second run. */
	readonly heroLicence: string
	readonly heroSubline: string
	/** The footer's release line: the stable release, naming both parts. */
	readonly releaseLine: string
	/** The release date as this Language writes it; the machine-readable date is `RELEASE_DATE`. */
	readonly releaseDate: string
	readonly docsLink: string
	/** The Star menu's summary: the GitHub mark, the count and this name, for a reader who hears it. */
	readonly starMenuLabel: string
	/** The Star menu's panel group label, above the repository rows. */
	readonly starMenuGroupLabel: string
	/** The Star menu's last row, to the Organisation on GitHub. */
	readonly starMenuAllRepos: string
	/** The Skills card's quiet star link to the onboarding skill's repository. */
	readonly starOnboarding: string
	readonly twoPartHeading: string
	/** The first diagram tile's title: the AI agent the visitor already runs. */
	readonly agentCardTitle: string
	/** The first diagram tile's one line, five words at most. */
	readonly agentCardCopy: string
	readonly cliCardTitle: string
	/** The second diagram tile's one line, five words at most. */
	readonly cliCardCopy: string
	/** The label on the connector between the two tiles: the command that joins them. */
	readonly diagramConnector: string
	/** The three steps under the command, in order: run it, answer the setup, it is ready. */
	readonly stepLabels: readonly string[]
	readonly cliDocsLink: string
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
