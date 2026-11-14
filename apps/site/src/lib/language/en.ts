import { OWNER_WRITTEN_PLACEHOLDER } from "./dictionary"
import type { LanguageEntry } from "./language"

/** English: the Language of `/en/`, and the fallback when nothing else chooses. */
export const ENGLISH: LanguageEntry = Object.freeze({
	language: "en",
	pathPrefix: "/en",
	countries: Object.freeze([]),
	dictionary: Object.freeze({
		languageName: "English",
		heroHeading: OWNER_WRITTEN_PLACEHOLDER,
		heroSubline: OWNER_WRITTEN_PLACEHOLDER,
		installHeading: "Install",
		docsLink: "Docs",
		githubLink: "GitHub",
		starOnGitHub: "Star on GitHub",
		copy: "Copy",
		copied: "Copied",
		footerDisclaimer: OWNER_WRITTEN_PLACEHOLDER,
		taxSentence: OWNER_WRITTEN_PLACEHOLDER,
		notFoundHeading: "Page not found",
		notFoundBody: "This link may have moved, or it may be mistyped.",
	}),
})
