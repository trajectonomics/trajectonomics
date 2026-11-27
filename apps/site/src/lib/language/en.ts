import { releaseFor } from "../site/release-snapshot"
import { ENGLISH_CONSENT } from "./en-consent"
import { ENGLISH_SECTIONS } from "./en-sections"
import type { LanguageEntry } from "./language"

/** The release strings English prints, from the committed Release snapshot. */
const RELEASE = releaseFor("en")

/** English: the Language of the Site's one address, and the fallback when nothing else chooses. */
export const ENGLISH: LanguageEntry = Object.freeze({
	language: "en",
	buildPath: "",
	locale: "en_US",
	countries: Object.freeze([]),
	dictionary: Object.freeze({
		...ENGLISH_SECTIONS,
		...ENGLISH_CONSENT,
		documentTitle: "Trajectonomics — traj: financial simulation for AI agents",
		description:
			"Trajectonomics makes traj, a free, open-source financial simulation tool for AI agents: a CLI and a skill that plan retirement with no account.",
		languageName: "English",
		languageSwitchLabel: "EN",
		heroHeadingPrefix: "Deterministic layers for",
		heroHeadingAccent: "Financial Planning",
		heroVersion: RELEASE.heroVersion,
		heroLicence: "AGPL-3.0 · open source",
		releaseLine: RELEASE.releaseLine,
		releaseDate: RELEASE.releaseDate,
		heroSubline:
			"traj is a free, open-source financial simulation tool built for AI agents. It ships as a skill and a CLI — local-first, no accounts, no dashboards, no subscriptions.",
		factLabels: Object.freeze(["Currency", "First run", "Agent"] as const),
		factTexts: Object.freeze([
			"Thai baht only, for now.",
			"About 100 MB downloads once.",
			"A coding agent that can run commands, such as Claude Code, Codex or Cursor.",
		] as const),
		docsLink: "Docs",
		blogLink: "Blog",
		dataLink: "Data",
		openjotLink: "OpenJot",
		repoLinkLabel: "GitHub stars",
		cliInstallLink: "Install the CLI directly",
		demoLink: "Try the demo",
		copy: "Copy prompt to your AI agents",
		copied: "Prompt copied",
		copiedLabel: "Copied",
		copyFailed: "Select the prompt and copy it.",
		licence: "AGPL-3.0-only",
		org: "trajectonomics",
		footerDisclaimer:
			"A bug is still possible. Tax is applied only when you ask for it, and every figure says whether it includes tax. Trust the figures traj returns. If you find a bug, open an issue on https://github.com/trajectonomics/trajectonomics/tree/main/apps/cli and we will update it as soon as we can.",
		notFoundHeading: "Page not found",
		notFoundBody: "This link may have moved, or it may be mistyped.",
	}),
	ownerWritten: Object.freeze([] as const),
})
