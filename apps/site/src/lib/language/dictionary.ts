/** Every string one Language shows. Every Language has the same keys (`GLOSSARY.md`). */
import type { LiveDemoWords } from "./live-demo-dictionary"
import type { ShareWords } from "./share-dictionary"

export interface Dictionary extends LiveDemoWords, ShareWords {
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
	/** The footer's release line: the Release snapshot's version, naming both parts. */
	readonly releaseLine: string
	/** The release date as this Language writes it; the machine-readable date is the snapshot's `releasedOn`. */
	readonly releaseDate: string
	readonly docsLink: string
	/** The header's link to the blog. */
	readonly blogLink: string
	/** The header's link to the data site. */
	readonly dataLink: string
	/** The header's link to the OpenJot page on the Site. */
	readonly openjotLink: string
	/** The header's one repository link, heard with its star count: the GitHub mark, the count and an arrow. */
	readonly repoLinkLabel: string
	/** The See it in action section's heading in the full Answer engine file. */
	readonly actionHeading: string
	/** The line under that heading: the two panels' claim in one sentence. */
	readonly actionLede: string
	/** The one question both transcripts open with. */
	readonly actionQuestion: string
	/** The speaker label of the visitor in a transcript. */
	readonly actionYou: string
	/** The speaker label of the agent in a transcript. */
	readonly actionAgent: string
	/** The left panel's tab: the agent asked alone. */
	readonly actionWithoutLabel: string
	/** The right panel's tab: the agent with the traj skill and CLI. */
	readonly actionWithLabel: string
	/** What the agent alone answers, twice, with a different guess each time. */
	readonly actionGuesses: readonly string[]
	/** The visitor's re-ask, which brings the contradictory second guess. */
	readonly actionReask: string
	/** The visitor's challenge: how did the agent arrive at its number. */
	readonly actionExplain: string
	/** The agent's confident rule of thumb, with nothing of the visitor's in it. */
	readonly actionGuessReason: string
	/** The visitor's doubt: is the agent sure. */
	readonly actionSure: string
	/** The agent's confession: it has none of the visitor's numbers, and its data is stale. */
	readonly actionConfession: string
	/** What the agent with traj answers: one figure, and the date it was computed. */
	readonly actionAnswer: string
	/** The question the agent asks before anything runs: the visitor's situation and goal. */
	readonly actionGuideQuestion: string
	/** The visitor's message that hands over the budget sheet they already keep. */
	readonly actionAttach: string
	/** The name on the sheet's file pill: a label, because the Site uploads nothing. */
	readonly actionAttachName: string
	/** What the agent says the sheet does not cover, and the one figure it asks for. */
	readonly actionNeedMore: string
	/** The visitor's answer: the balance and the monthly saving the CLI needs. */
	readonly actionData: string
	/** The line above the command: the skill records the balance, fills base.json and runs the CLI. */
	readonly actionSkillLine: string
	/** The date the figure was computed, under the agent's answer. */
	readonly actionProvenance: string
	/** The caption under the output: it is an abridged example, not a live result. */
	readonly actionExampleNote: string
	/** The small label above the Features heading. */
	readonly featuresEyebrow: string
	/** The Features section's `h2`. */
	readonly featuresHeading: string
	/**
	 * Six feature titles, in order; each is plain text, not a heading (ADR 0012). The first two head the
	 * section's wide cards, each with a sample of the CLI's output; the other four are the small cards.
	 */
	readonly featureTitles: readonly string[]
	/** Six feature sentences, one per title and in the same order. */
	readonly featureCopies: readonly string[]
	/** The small label above the FAQ heading. */
	readonly faqEyebrow: string
	/** The FAQ section's `h2`. */
	readonly faqHeading: string
	/** The FAQ's questions, in order; each is a disclosure's summary, plain text, not a heading. */
	readonly faqQuestions: readonly string[]
	/** One answer per question, in the same order. */
	readonly faqAnswers: readonly string[]
	/** The small label above the closing section's heading. */
	readonly ctaEyebrow: string
	/** The closing section's `h2`: the demo's question, put to the visitor's own agent. */
	readonly ctaHeading: string
	/** The line under the closing heading. */
	readonly ctaLede: string
	/** The closing section's filled link, which goes back up to the Copy control (ADR 0015 keeps one). */
	readonly ctaPromptLink: string
	/** The closing section's outlined link to the CLI installation page; worded apart from the hero's, so no two controls read alike. */
	readonly ctaInstallLink: string
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
	/** The banner's landmark name, which a screen reader announces before its text. */
	readonly consentLabel: string
	/** The banner's question: the one cookie it asks for, what it holds and how long it lasts. */
	readonly consentText: string
	/** The banner link that stores the visitor's yes, which reloads the page without the banner. */
	readonly consentAllow: string
	/** The banner link that stores the visitor's no, which keeps the page without a cookie. */
	readonly consentDecline: string
	/** The footer link that clears the choice, so the banner is asked again. */
	readonly footerCookieLink: string
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
