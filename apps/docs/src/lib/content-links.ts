import type { ContentFile } from "./content-pages"
import { contentPathOf, internalLinks, resolvesPagePath } from "./content-pages"
import type { ContentStructureProblem } from "./content-structure"
import { namesSitePath } from "./docs-links"

/**
 * A site-absolute link that has no page behind it. The Site Home at `/`, the blog at `/blog/...` and
 * the data site at `/data/...` are other Workers' pages on the same host, and the Landing Page at
 * `/docs/` is an Astro page, not a content page, so a link to any of them resolves without a file.
 */
function linkProblems(file: ContentFile, files: readonly ContentFile[]): readonly string[] {
	return internalLinks(file.content).filter((link) => {
		if (namesSitePath(link)) return false
		const path = contentPathOf(link)
		return path !== "" && !resolvesPagePath(files, path)
	})
}

/** Every site-absolute link in an authored page names a page that exists. */
export function linkStructureProblems(
	files: readonly ContentFile[],
): readonly ContentStructureProblem[] {
	return files
		.filter((file) => /\.mdx?$/.test(file.path))
		.flatMap((file) =>
			linkProblems(file, files).map((link) => ({
				rule: "internal-link" as const,
				detail: `${file.path} links to ${link}, which has no page`,
			})),
		)
}
