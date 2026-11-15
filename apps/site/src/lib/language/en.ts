import type { LanguageEntry } from "./language"

/** English: the Language of `/en/`, and the fallback when nothing else chooses. */
export const ENGLISH: LanguageEntry = Object.freeze({
	language: "en",
	pathPrefix: "/en",
	countries: Object.freeze([]),
	dictionary: Object.freeze({
		languageName: "English",
		languageSwitchLabel: "EN",
		heroHeadingPrefix: "The only tool your agent needs for",
		heroHeadingCycle: Object.freeze([
			"retirement planning.",
			"financial projections.",
			"your future.",
		] as const),
		heroEyebrow: "v0.1.0-alpha.1 is launching now — 2026-11-14",
		heroSubline:
			"traj is a free, open-source money tool built for AI agents. One command installs it as a skill, and your agent handles the rest — no account, no dashboard, no signup.",
		docsLink: "Docs",
		githubLink: "GitHub",
		starOnGitHub: "Star on GitHub",
		copy: "Copy",
		copied: "Copied",
		copyFailed: "Select the command and copy it.",
		licence: "MIT",
		org: "trajectonomics",
		footerDisclaimer:
			"traj is in alpha, so a bug is possible. Tax is applied only when you ask for it, and every figure says whether it includes tax. Trust the figures traj returns. If you find a bug, open an issue on https://github.com/trajectonomics/cli and we will update it as soon as we can.",
		notFoundHeading: "Page not found",
		notFoundBody: "This link may have moved, or it may be mistyped.",
	}),
	ownerWritten: Object.freeze([] as const),
})
