import { posix } from "node:path"

/** The tax guide's source, relative to the repository root. The docs page is generated from it. */
export const TAX_GUIDE_SOURCE = "packages/core/tax/CONTRIBUTING.md"

/** The generated page, relative to this app. The Contribute Tab lists it as `tax`. */
export const TAX_GUIDE_PAGE = "src/content/docs/contribute/tax.mdx"

/** The repository's GitHub URL on `main`, where the guide's relative links go. */
export const REPOSITORY_BLOB_URL = "https://github.com/trajectonomics/trajectonomics/blob/main/"

/** The frontmatter the generated page carries, so Fumadocs titles and describes it. */
const FRONTMATTER = [
	"---",
	"title: Tax contributor guide",
	"description: How to contribute tax rules: what to change, the source rule, two walkthroughs, the checks and review.",
	"---",
	"",
].join("\n")

/** The guide's own title line, which the page's frontmatter replaces. */
const TITLE_LINE = /^# .*\n+/

/** A link whose target is relative: not a URL, not a same-page anchor, not an absolute path. */
const RELATIVE_LINK = /\]\((?!https?:|mailto:|#|\/)([^)\s]+)\)/g

/**
 * Rewrites one relative link target, written relative to the guide's own folder, as a GitHub URL on
 * `main`, so the link still works from the Docs Portal.
 */
function absoluteTarget(target: string, sourcePath: string): string {
	const folder = posix.dirname(sourcePath)
	return `${REPOSITORY_BLOB_URL}${posix.normalize(posix.join(folder, target))}`
}

/**
 * The generated docs page for the tax guide: frontmatter, then the guide's body with its title line
 * removed and its relative links made absolute. A pure function of the guide's text.
 */
export function renderTaxGuidePage(guide: string, sourcePath = TAX_GUIDE_SOURCE): string {
	const body = guide.replace(TITLE_LINE, "").replace(RELATIVE_LINK, (_match, target: string) => {
		return `](${absoluteTarget(target, sourcePath)})`
	})
	return `${FRONTMATTER}\n${body}`
}
