import type { Language } from "../../language/language"
import { LANGUAGES, languageEntry, localeUrl } from "../../language/languages"
import {
	DOCS_CLI_PATH,
	DOCS_PATH,
	GITHUB_ORG_URL,
	GITHUB_SKILLS_URL,
	INSTALL_COMMAND,
	SITE_NAME,
	SKILLS_LICENCE_URL,
	STAR_REPOS,
} from "../../site"
import type { BuiltFile } from "../built-files"
import type { BuildFailure } from "../failures"
import { switcher } from "./homes"

/** The parts of a home a test replaces to break one rule at a time. */
export interface HeroParts {
	/** The whole inner markup of the hero's `<h1>`, so a test can drop a phrase the headline cycles. */
	readonly headline?: string
	readonly subline?: string
	readonly disclaimer?: string
	readonly command?: string
	readonly button?: string
	readonly extra?: string
}

/** Every phrase the hero's `<h1>` carries: the static prefix and the suffixes it cycles. */
function headlines(language: Language): readonly string[] {
	const dictionary = languageEntry(language).dictionary
	return [dictionary.heroHeadingPrefix, ...dictionary.heroHeadingCycle]
}

/** The Star menu's panel, one link per repository in star order. */
const starPanel = STAR_REPOS.map((repo) => `<a href="${repo.url}">${repo.name}</a>`).join("")

/** One Language's home as the build must produce it, with every region and the copy command. */
export function heroHome(language: Language, parts: HeroParts = {}): BuiltFile {
	const dictionary = languageEntry(language).dictionary
	const headline =
		parts.headline ??
		headlines(language)
			.map((phrase) => `<span>${phrase}</span>`)
			.join("")
	const command = parts.command ?? `<code data-install-command>${INSTALL_COMMAND}</code>`
	const button =
		parts.button ??
		`<button type="button" data-copied="${dictionary.copied}" data-copy-failed="${dictionary.copyFailed}">${dictionary.copy}</button>`
	const content = [
		`<html lang="${language}"><head><title>${SITE_NAME}</title></head>`,
		"<body>",
		`<header><nav><a href="${localeUrl(language)}" aria-label="${SITE_NAME}"><svg></svg></a>`,
		`<a href="${DOCS_PATH}">${dictionary.docsLink}</a>`,
		`<details><summary>${dictionary.starMenuLabel}</summary><div>${starPanel}</div></details>`,
		`<details><summary>${dictionary.languageSwitchLabel}</summary><div>${switcher(language)}</div></details>`,
		"</nav></header>",
		'<main class="bg-muted text-foreground">',
		`<h1>${headline}</h1>`,
		`<p>${parts.subline ?? dictionary.heroSubline}</p>`,
		`<div>${command}${button}</div>`,
		`<ol><li>${dictionary.stepLabels.join("</li><li>")}</li></ol>`,
		'<p role="status"></p>',
		"<section>",
		`<h2>${dictionary.twoPartHeading}</h2>`,
		`<p>${dictionary.agentCardTitle}</p><p>${dictionary.agentCardCopy}</p>`,
		`<p>${dictionary.cliCardTitle}</p><p>${dictionary.cliCardCopy}</p>`,
		`<p>${dictionary.diagramConnector}</p>`,
		`<a href="${GITHUB_SKILLS_URL}">${dictionary.starOnboarding}</a>`,
		`<a href="${DOCS_CLI_PATH}">${dictionary.cliDocsLink}</a>`,
		"</section>",
		"</main>",
		'<footer class="bg-stage text-stage-foreground"><ul>',
		`<li><a href="${SKILLS_LICENCE_URL}">${dictionary.licence}</a></li>`,
		`<li><a href="${GITHUB_ORG_URL}">${dictionary.org}</a></li>`,
		`</ul><p>${parts.disclaimer ?? dictionary.footerDisclaimer}</p></footer>`,
		parts.extra ?? "",
		"</body></html>",
	].join("\n")
	return { path: `${language}/index.html`, content }
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
