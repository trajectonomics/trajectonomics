/** Every string one Language shows. Every Language has the same keys (`GLOSSARY.md`). */
export interface Dictionary {
	/** The document title of this Language's home: what a tab and a search result show. */
	readonly documentTitle: string
	/** This Language's home one line of summary, for a search result and a shared link. */
	readonly description: string
	/** The Language's own name, the visible label of its switcher link on the other home. */
	readonly languageName: string
	/** The short label of the current Language, the Language menu's summary. */
	readonly languageSwitchLabel: string
	/** The hero headline up to its accent: the plain run before the highlighted words. */
	readonly heroHeadingPrefix: string
	/** The words of the headline the accent colour highlights, last in the line. The headline does not move. */
	readonly heroHeadingAccent: string
	/** The stable release's version, the first run of the pill above the headline. */
	readonly heroVersion: string
	/** The licence note beside the version: the pill's second run. */
	readonly heroLicence: string
	readonly heroSubline: string
	/**
	 * The three plain facts in the footer, one label per fact: the currency the CLI accepts, the first
	 * run's download and the agent that can run it. They sit with the footer's fine print.
	 */
	readonly factLabels: readonly string[]
	/** One fact per label, in the same order: the plain sentence under its label. */
	readonly factTexts: readonly string[]
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
	/** The star link under the How it works section, to the onboarding skill's repository. */
	readonly starOnboarding: string
	/** The small label above the See it in action heading. */
	readonly actionEyebrow: string
	/** The See it in action section's `h2`. */
	readonly actionHeading: string
	/** The line under that heading: what the visitor is about to compare. */
	readonly actionLede: string
	/** The one question both panels put to the agent. */
	readonly actionQuestion: string
	/** The speaker label of the visitor in a transcript. */
	readonly actionYou: string
	/** The speaker label of the agent in a transcript. */
	readonly actionAgent: string
	/** The left panel's tab: the agent asked alone. */
	readonly actionWithoutLabel: string
	/** The left panel's verdict under its three runs. */
	readonly actionWithoutNote: string
	/** The right panel's tab: the agent with the traj skill and CLI. */
	readonly actionWithLabel: string
	/** The right panel's verdict under its three runs. */
	readonly actionWithNote: string
	/** One label per run, so each panel reads as three attempts at the same question. */
	readonly actionRunLabels: readonly string[]
	/** What the agent alone answers on each run, one string per run: three different guesses. */
	readonly actionGuesses: readonly string[]
	/** What the agent with traj answers on every run: one string, repeated, because the answer is. */
	readonly actionAnswer: string
	/** The line above the command: the agent loads the skill, which runs the CLI. */
	readonly actionSkillLine: string
	/** The caption under the output: it is an abridged example, not a live result. */
	readonly actionExampleNote: string
	/** The small label above the How it works heading. */
	readonly howEyebrow: string
	/** The How it works section's `h2`: the agent owns the presentation, traj owns the logic. */
	readonly howHeading: string
	/** The line under that heading: the workflow in one sentence. */
	readonly howLede: string
	/** The top layer's name. */
	readonly howPresentationLabel: string
	/** Who owns the top layer. */
	readonly howPresentationOwner: string
	/** What the top layer is: how the answer is explained. */
	readonly howPresentationCopy: string
	/** What the agent draws on the top layer, four short chips. */
	readonly howPresentationItems: readonly string[]
	/** The band between the layers: the skills. */
	readonly howSkillsLabel: string
	/** What a skill does: tells the agent which commands to run. */
	readonly howSkillsCopy: string
	/** The bottom layer's name. */
	readonly howLogicLabel: string
	/** Who owns the bottom layer. */
	readonly howLogicOwner: string
	/** What the bottom layer is: the arithmetic. */
	readonly howLogicCopy: string
	/** What traj computes on the bottom layer, four short chips. */
	readonly howLogicItems: readonly string[]
	/** The workflow as four ordered steps, from the visitor's question to the figure shown. */
	readonly howSteps: readonly string[]
	/** The small label above the Features heading. */
	readonly featuresEyebrow: string
	/** The Features section's `h2`. */
	readonly featuresHeading: string
	/** Six feature titles, in order; each is plain text, not a heading (ADR 0012). */
	readonly featureTitles: readonly string[]
	/** Six feature sentences, one per title and in the same order. */
	readonly featureCopies: readonly string[]
	readonly cliDocsLink: string
	/** The way out under the prompt: the Docs Portal's CLI installation page, which needs no agent. */
	readonly cliInstallLink: string
	readonly copy: string
	/** What the toast announces once the prompt is on the clipboard. */
	readonly copied: string
	/** The Copy button's own word while the notice lasts: short, because the button is one word wide. */
	readonly copiedLabel: string
	readonly copyFailed: string
	readonly licence: string
	readonly org: string
	readonly footerDisclaimer: string
	/** The footer's one-line description of the project, beside the wordmark. */
	readonly footerTagline: string
	/** The footer's first link column: the pages of the Site and the docs. */
	readonly footerProductLabel: string
	/** The footer's second link column: the repositories. */
	readonly footerSourceLabel: string
	/** The footer's third link column: where to get help or report a bug. */
	readonly footerHelpLabel: string
	/** The footer link to the Docs Portal; worded apart from the header's, so no two links read alike. */
	readonly footerDocsLink: string
	/** The footer link to the CLI docs; worded apart from the section's link to the same page. */
	readonly footerCliDocsLink: string
	/** The footer link to the CLI installation page. */
	readonly footerInstallLink: string
	/** The footer link to the CLI's repository. */
	readonly footerCliRepo: string
	/** The footer link to the skills repository. */
	readonly footerSkillsRepo: string
	/** The footer link to the CLI's issue tracker. */
	readonly footerIssues: string
	/** The footer link to the CLI's releases. */
	readonly footerReleases: string
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
