import type { Language } from "../language/language"
import { structuredData } from "../site/structured-data"
import type { BuiltFile } from "./built-files"
import type { BuildFailure } from "./failures"
import { buildFailure } from "./failures"
import { isDataBlockType, scriptElements } from "./html"
import { jsonDifferences } from "./json-difference"
import { builtHomes } from "./language-home"
import { pageUrl } from "./page-url"

/** The body of every Structured data block on a page, in document order, comments included. */
function blocksOf(html: string): readonly string[] {
	return scriptElements(html).flatMap((element) =>
		isDataBlockType(element.attributes["type"]) ? [element.body] : [],
	)
}

/** The block parsed as one JSON value, or `undefined` when it is not JSON at all. */
function parseBlock(block: string): unknown {
	try {
		return JSON.parse(block)
	} catch {
		return undefined
	}
}

/** The value as a maintainer reads it: its JSON, or `nothing` for a property the block leaves out. */
function shown(value: unknown): string {
	return value === undefined ? "nothing" : JSON.stringify(value)
}

/** One Language home carries one block, it parses, and it states the page the build made. */
function failuresOf(file: BuiltFile, language: Language): readonly BuildFailure[] {
	const path = pageUrl(file.path)
	const blocks = blocksOf(file.content)
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
	const parsed = parseBlock(block)
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
