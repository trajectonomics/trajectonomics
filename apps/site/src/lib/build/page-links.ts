import { DOCS_CLI_INSTALL_PATH, DOCS_PATH, GITHUB_SKILLS_URL } from "../site"
import type { BuiltFile } from "./built-files"
import type { BuildFailure, BuildFailureCode } from "./failures"
import { buildFailure } from "./failures"
import { elementsByTag, scanHtml } from "./html"
import { builtHomes } from "./language-home"
import { pageUrl } from "./page-url"

/** One link a Language document must carry, by `href` alone: the Dictionary supplies the text. */
const REQUIRED_LINKS = [
	{ href: DOCS_PATH, code: "PAGE_DOCS_LINK_MISSING" },
	{ href: DOCS_CLI_INSTALL_PATH, code: "PAGE_CLI_INSTALL_LINK_MISSING" },
	{ href: GITHUB_SKILLS_URL, code: "PAGE_SKILLS_LINK_MISSING" },
] as const satisfies readonly { href: string; code: BuildFailureCode }[]

/** Every Language document links to the Docs Portal, the CLI installation page and the skills repository. */
export function checkPageLinks(files: readonly BuiltFile[]): readonly BuildFailure[] {
	return builtHomes(files).flatMap(({ file }) => {
		const hrefs = elementsByTag(scanHtml(file.content), "a").map(
			(anchor) => anchor.attributes["href"],
		)
		return REQUIRED_LINKS.filter((link) => !hrefs.includes(link.href)).map((link) =>
			buildFailure(link.code, pageUrl(file.path), `has no <a href="${link.href}">.`),
		)
	})
}
