import type { Language } from "../../language/language"
import { CLEAN_URL, LANGUAGES, languageEntry, languageHomeFile } from "../../language/languages"
import {
	DEMO_PATH,
	DOCS_PATH,
	GITHUB_ORG_URL,
	GITHUB_REPO_URL,
	GITHUB_SKILLS_URL,
	SITE_NAME,
	SKILLS_LICENCE_URL,
} from "../../site"
import type { BuiltFile } from "../built-files"
import type { BuildFailure } from "../failures"
import { factsStrip } from "./facts"
import { headOf } from "./head"
import { switcher } from "./homes"
import { installWindow, type WindowParts } from "./window"

/** The parts of a home a test replaces to break one rule at a time. */
export interface HeroParts extends WindowParts {
	/** The whole inner markup of the hero's `<h1>`, so a test can drop a phrase the headline cycles. */
	readonly headline?: string
	readonly subline?: string
	/** The strip in the footer, so a test can drop a fact or move it out of the footer. */
	readonly facts?: string
	readonly disclaimer?: string
	readonly extra?: string
}

/** Every phrase the hero's `<h1>` carries: the plain run and the accent. */
function headlines(language: Language): readonly string[] {
	const dictionary = languageEntry(language).dictionary
	return [dictionary.heroHeadingPrefix, dictionary.heroHeadingAccent]
}

/** One Language's home as the build must produce it, with every region and the prompt window. */
export function heroHome(language: Language, parts: HeroParts = {}): BuiltFile {
	const dictionary = languageEntry(language).dictionary
	const headline =
		parts.headline ??
		headlines(language)
			.map((phrase) => `<span>${phrase}</span>`)
			.join("")
	const content = [
		`<html lang="${language}"><head>${headOf(language)}</head>`,
		"<body>",
		`<header><nav><a href="${CLEAN_URL}" aria-label="${SITE_NAME}"><svg></svg></a>`,
		`<a href="${DOCS_PATH}">${dictionary.docsLink}</a>`,
		`<a href="${GITHUB_REPO_URL}">${dictionary.repoLinkLabel}</a>`,
		`<details><summary>${dictionary.languageSwitchLabel}</summary><div>${switcher(language)}</div></details>`,
		"</nav></header>",
		'<main class="bg-muted text-foreground">',
		`<h1>${headline}</h1>`,
		`<p>${parts.subline ?? dictionary.heroSubline}</p>`,
		installWindow(dictionary, parts),
		`<p><a href="${DEMO_PATH}">${dictionary.liveDemoOpen}</a></p>`,
		'<p role="status"></p>',
		"<section>",
		`<h2>${dictionary.actionHeading}</h2>`,
		`<p>${dictionary.actionQuestion}</p>`,
		"</section>",
		"<section>",
		`<h2>${dictionary.featuresHeading}</h2>`,
		"</section>",
		"</main>",
		'<footer class="bg-stage text-stage-foreground"><ul>',
		`<li><a href="${GITHUB_SKILLS_URL}">${dictionary.footerSkillsRepo}</a></li>`,
		`<li><a href="${SKILLS_LICENCE_URL}">${dictionary.licence}</a></li>`,
		`<li><a href="${GITHUB_ORG_URL}">${dictionary.org}</a></li>`,
		"</ul>",
		parts.facts ?? factsStrip(dictionary),
		`<p>${parts.disclaimer ?? dictionary.footerDisclaimer}</p>`,
		"</footer>",
		parts.extra ?? "",
		"</body></html>",
	].join("\n")
	return { path: languageHomeFile(language), content }
}

/** Every Language's home, with `page` standing in for the home at the same path. */
export function heroHomes(page?: BuiltFile): readonly BuiltFile[] {
	return LANGUAGES.map((entry) => {
		const built = heroHome(entry.language)
		return page?.path === built.path ? page : built
	})
}

/** The failure codes one check reports for the hero homes, with `page` standing in for one. */
export function heroCodes(
	check: (files: readonly BuiltFile[]) => readonly BuildFailure[],
	page?: BuiltFile,
): readonly string[] {
	return check(heroHomes(page)).map((failure) => failure.code)
}
