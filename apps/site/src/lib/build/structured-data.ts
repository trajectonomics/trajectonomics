import type { Language } from "../language/language"
import { structuredData } from "../site/structured-data"
import type { BuiltFile } from "./built-files"
import type { BuildFailure } from "./failures"
import { buildFailure } from "./failures"
import { jsonDifferences } from "./json-difference"
import { builtHomes } from "./language-home"
import { pageUrl } from "./page-url"
import { dataBlocks, parsedBlock } from "./structured-data-blocks"

/** The value as a maintainer reads it: its JSON, or `nothing` for a property the block leaves out. */
function shown(value: unknown): string {
	return value === undefined ? "nothing" : JSON.stringify(value)
}

/**
 * One Language home carries one block, it parses, and it states every node of the one the Site
 * publishes: the WebSite, the Organization and traj, property by property.
 */
function failuresOf(file: BuiltFile, language: Language): readonly BuildFailure[] {
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
	return jsonDifferences(structuredData(language), parsed).map((difference) =>
		buildFailure(
			"JSON_LD_WRONG",
			path,
			`states ${difference.at === "" ? "a block" : `its ${difference.at} as`} ${shown(difference.written)}, not ${shown(difference.stated)}.`,
		),
	)
}

/** Every Language home states one Structured data block, and it is that page's own. */
export function checkStructuredData(files: readonly BuiltFile[]): readonly BuildFailure[] {
	return builtHomes(files).flatMap(({ entry, file }) => failuresOf(file, entry.language))
}
