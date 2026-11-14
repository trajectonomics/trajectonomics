import type { Language } from "../../language/language"
import { LANGUAGES, languageEntry, localeUrl } from "../../language/languages"
import {
	CLI_LICENCE_URL,
	DOCS_PATH,
	GITHUB_CLI_URL,
	GITHUB_ORG_URL,
	INSTALL_COMMAND,
	SITE_NAME,
} from "../../site"
import type { BuiltFile } from "../built-files"
import type { BuildFailure } from "../failures"
import { switcher } from "./homes"

/** The parts of a home a test replaces to break one rule at a time. */
export interface HeroParts {
	readonly headline?: string
	readonly subline?: string
	readonly disclaimer?: string
	readonly tax?: string
	readonly command?: string
	readonly button?: string
	readonly extra?: string
}

/** One Language's home as the build must produce it, with the three regions and the copy command. */
export function heroHome(language: Language, parts: HeroParts = {}): BuiltFile {
	const dictionary = languageEntry(language).dictionary
	const command = parts.command ?? `<code data-install-command>${INSTALL_COMMAND}</code>`
	const button =
		parts.button ??
		`<button type="button" data-copied="${dictionary.copied}" data-copy-failed="${dictionary.copyFailed}">${dictionary.copy}</button>`
	const content = [
		`<html lang="${language}"><head><title>${SITE_NAME}</title></head>`,
		"<body>",
		`<header><nav><a href="${localeUrl(language)}" aria-label="${SITE_NAME}"><svg></svg></a>`,
		`<a href="${DOCS_PATH}">${dictionary.docsLink}</a>`,
		`<a href="${GITHUB_CLI_URL}">${dictionary.githubLink}</a>`,
		switcher(language),
		"</nav></header>",
		"<main>",
		`<h1>${parts.headline ?? dictionary.heroHeading}</h1>`,
		`<p>${parts.subline ?? dictionary.heroSubline}</p>`,
		`<div>${command}${button}</div>`,
		'<p role="status"></p>',
		`<a href="${GITHUB_CLI_URL}">${dictionary.starOnGitHub}</a>`,
		"</main>",
		"<footer><ul>",
		`<li><a href="${CLI_LICENCE_URL}">${dictionary.licence}</a></li>`,
		`<li><a href="${GITHUB_ORG_URL}">${dictionary.org}</a></li>`,
		`</ul><p>${parts.disclaimer ?? dictionary.footerDisclaimer}</p><p>${parts.tax ?? dictionary.taxSentence}</p></footer>`,
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
