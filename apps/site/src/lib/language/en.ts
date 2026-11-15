import type { LanguageEntry } from "./language"

/** English: the Language of `/en/`, and the fallback when nothing else chooses. */
export const ENGLISH: LanguageEntry = Object.freeze({
	language: "en",
	pathPrefix: "/en",
	countries: Object.freeze([]),
	dictionary: Object.freeze({
		languageName: "English",
		languageSwitchLabel: "EN",
		heroHeadingPrefix: "The only tool your agent needs to",
		heroHeadingCycle: Object.freeze([
			"plan your retirement.",
			"project your finances.",
			"build your future.",
		] as const),
		heroRelease: "v0.1.0 stable — traj CLI + traj-onboarding",
		heroReleaseDate: "12 Nov 2026",
		heroSubline:
			"traj is a free, open-source money tool built for AI agents. Install as a skill in one command, and let your agent handle the rest — no accounts, no dashboards, no subscriptions.",
		docsLink: "Docs",
		starMenuLabel: "Star",
		starOnboarding: "Star traj-onboarding",
		twoPartHeading: "Two parts, one command",
		skillsCardTitle: "Skills",
		skillsCardBody:
			"Instructions your agent follows. They adapt to how you like to work, and your agent decides when to use them.",
		cliCardTitle: "traj CLI",
		cliCardBody:
			"The arithmetic. Same input, same answer, every time — so an agent or a script can rely on it. It never calls a model.",
		cliDocsLink: "Read the CLI docs",
		twoPartFootnote: "One command installs traj-onboarding; it sets up the CLI and the traj skill.",
		nextStep:
			"Now open your coding agent and paste it. traj-onboarding asks about your money and gets you started.",
		copy: "Copy",
		copied: "Copied",
		copyFailed: "Select the command and copy it.",
		licence: "MIT",
		org: "trajectonomics",
		footerDisclaimer:
			"traj v0.1.0 is the first stable release; a bug is still possible. Tax is applied only when you ask for it, and every figure says whether it includes tax. Trust the figures traj returns. If you find a bug, open an issue on https://github.com/trajectonomics/cli and we will update it as soon as we can.",
		notFoundHeading: "Page not found",
		notFoundBody: "This link may have moved, or it may be mistyped.",
	}),
	ownerWritten: Object.freeze([] as const),
})
