import type { BuiltFile } from "./built-files"
import type { BuildFailure } from "./failures"
import { buildFailure } from "./failures"
import { builtLanguagePages } from "./language-pages"
import { pageUrl } from "./page-url"
import { dataBlocks, parsedBlock } from "./structured-data-blocks"

/** The claims about a product a block may not state: no review exists, so no rating does either. */
const UNSUPPORTED_CLAIMS: readonly string[] = Object.freeze([
	"aggregateRating",
	"review",
	"reviewRating",
])

/** Every claim of the list one JSON value states, anywhere in its graph. */
function claimsIn(value: unknown): readonly string[] {
	if (Array.isArray(value)) return value.flatMap(claimsIn)
	if (typeof value !== "object" || value === null) return []
	return Object.entries(value as Readonly<Record<string, unknown>>).flatMap(([key, nested]) => [
		...(UNSUPPORTED_CLAIMS.includes(key) ? [key] : []),
		...claimsIn(nested),
	])
}

/** The claims one page's block states that no fact on the page supports. */
function failuresOf(file: BuiltFile): readonly BuildFailure[] {
	const path = pageUrl(file.path)
	return dataBlocks(file.content).flatMap((block) => {
		const parsed = parsedBlock(block)
		if (parsed === undefined) return []
		return claimsIn(parsed).map((claim) =>
			buildFailure(
				"JSON_LD_CLAIM_PRESENT",
				path,
				`states \`${claim}\`, and the page shows no review and no rating for it.`,
			),
		)
	})
}

/** Every page states no claim the page cannot support, such as a rating or a review. */
export function checkStructuredDataClaims(files: readonly BuiltFile[]): readonly BuildFailure[] {
	return builtLanguagePages(files).flatMap(({ file }) => failuresOf(file))
}
