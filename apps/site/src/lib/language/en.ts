import type { LanguageEntry } from "./language"

/** English: the Language of `/en/`, and the fallback when nothing else chooses. */
export const ENGLISH: LanguageEntry = Object.freeze({
	language: "en",
	pathPrefix: "/en",
	countries: Object.freeze([]),
	dictionary: Object.freeze({
		languageName: "English",
		languageSwitchLabel: "EN",
		heroHeading: "The only tool your agent needs for your future.",
		heroHeadingCycle: Object.freeze([
			"The only tool your agent needs for retirement planning",
			"The only tool your agent needs for financial projection",
		] as const),
		heroSubline:
			"Tell your agent about your financial situation and your goal. It uses traj under the hood to run the accounts, the financial projection, and a comparison of life scenarios, then interprets the result for you. You get tested math, in the format you like.",
		docsLink: "Docs",
		githubLink: "GitHub",
		starOnGitHub: "Star on GitHub",
		copy: "Copy",
		copied: "Copied",
		copyFailed: "Select the command and copy it.",
		licence: "MIT",
		org: "trajectonomics",
		footerDisclaimer:
			"traj is in alpha, so a bug is possible. Tax is not applied yet. Trust the figures traj returns. If you find a bug, open an issue on https://github.com/trajectonomics/skills and we will update it as soon as we can.",
		notFoundHeading: "Page not found",
		notFoundBody: "This link may have moved, or it may be mistyped.",
	}),
	ownerWritten: Object.freeze([] as const),
})
