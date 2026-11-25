import type { LanguagePage } from "../language/language-pages"
import { openJotStructuredData } from "../site/openjot-structured-data"
import { structuredData } from "../site/structured-data"
import type { BuiltFile } from "./built-files"
import type { BuildFailure } from "./failures"
import { buildFailure } from "./failures"
import { jsonDifferences } from "./json-difference"
import { builtLanguagePages } from "./language-pages"
import { pageUrl } from "./page-url"
import { dataBlocks, parsedBlock } from "./structured-data-blocks"

/** The value as a maintainer reads it: its JSON, or `nothing` for a property the block leaves out. */
function shown(value: unknown): string {
	return value === undefined ? "nothing" : JSON.stringify(value)
}

/** The one block a page must state, from the page its own kind draws. */
function expectedBlock(page: LanguagePage): unknown {
	return page.kind === "home" ? structuredData(page.language) : openJotStructuredData(page.language)
}

/**
 * One page carries one block, it parses, and it states every node of the one the Site publishes for that
 * page: the WebSite, the Organization and the app or CLI, property by property.
 */
function failuresOf(file: BuiltFile, page: LanguagePage): readonly BuildFailure[] {
	const path = pageUrl(file.path)
	const blocks = dataBlocks(file.content)
	const [block] = blocks
	if (block === undefined) {
		return [
			buildFailure(
				"JSON_LD_MISSING",
				path,
				"carries no Structured data block, so a crawler has nothing to attribute.",
			),
		]
	}
	if (blocks.length > 1) {
		return [buildFailure("JSON_LD_DUPLICATE", path, `carries ${blocks.length} blocks, not one.`)]
	}
	const parsed = parsedBlock(block)
	if (parsed === undefined) {
		return [buildFailure("JSON_LD_INVALID", path, "carries a block no JSON parser can read.")]
	}
	return jsonDifferences(expectedBlock(page), parsed).map((difference) =>
		buildFailure(
			"JSON_LD_WRONG",
			path,
			`states ${difference.at === "" ? "a block" : `its ${difference.at} as`} ${shown(difference.written)}, not ${shown(difference.stated)}.`,
		),
	)
}

/** Every page states one Structured data block, and it is that page's own. */
export function checkStructuredData(files: readonly BuiltFile[]): readonly BuildFailure[] {
	return builtLanguagePages(files).flatMap(({ page, file }) => failuresOf(file, page))
}
