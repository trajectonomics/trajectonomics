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
		heroVersion: "v0.1.0",
		heroLicence: "MIT · open source",
		releaseLine: "v0.1.0 stable — traj CLI + traj-onboarding",
		releaseDate: "12 Nov 2026",
		heroSubline:
			"traj is a free, open-source financial simulation tool built for AI agents. Ship as a skill and CLI — local-first, no accounts, no dashboards, no subscriptions.",
		docsLink: "Docs",
		starMenuLabel: "GitHub stars",
		starMenuGroupLabel: "Repositories",
		starMenuAllRepos: "All repositories",
		starOnboarding: "Star traj-onboarding",
		twoPartHeading: "Two parts, one command",
		agentCardTitle: "AI agent",
		agentCardCopy: "Your agent does the talking.",
		cliCardTitle: "traj CLI",
		cliCardCopy: "Same input, the same answer.",
		diagramConnector: "traj calc",
		stepLabels: Object.freeze([
			"1 Install the onboarding skill",
			"2 Open your coding agent",
			"3 Run the onboarding skill",
		] as const),
		cliDocsLink: "Read the CLI docs",
		cliInstallLink: "Install the CLI directly",
		copy: "Copy",
		copied: "Command copied",
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
