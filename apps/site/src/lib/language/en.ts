import type { Dictionary } from "./dictionary"
import { OWNER_WRITTEN_PLACEHOLDER } from "./dictionary"
import type { LanguageEntry } from "./language"

/** English: the Language of `/en/`, and the fallback when nothing else chooses. */
export const ENGLISH: LanguageEntry = Object.freeze({
	language: "en",
	pathPrefix: "/en",
	countries: Object.freeze([]),
	dictionary: Object.freeze({
		languageName: "English",
		languageSwitchLabel: "EN",
		heroHeading: "A money tool your AI agent operates.",
		heroSubline:
			"Tell your agent what you earn, spend and owe. traj keeps the books and returns exact, repeatable numbers. Free and open source. Thailand first.",
		docsLink: "Docs",
		githubLink: "GitHub",
		starOnGitHub: "Star on GitHub",
		copy: "Copy",
		copied: "Copied",
		copyFailed: "Select the command and copy it.",
		licence: "MIT",
		org: "trajectonomics",
		footerDisclaimer: OWNER_WRITTEN_PLACEHOLDER,
		taxSentence: OWNER_WRITTEN_PLACEHOLDER,
		notFoundHeading: "Page not found",
		notFoundBody: "This link may have moved, or it may be mistyped.",
	}),
	ownerWritten: Object.freeze([
		"footerDisclaimer",
		"taxSentence",
	] as const satisfies readonly (keyof Dictionary)[]),
})
