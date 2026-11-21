import { isDataBlockType, scriptElements } from "./html"

/** Every Structured data block on a page, in document order, its body as written. */
export function dataBlocks(html: string): readonly string[] {
	return scriptElements(html).flatMap((element) =>
		isDataBlockType(element.attributes["type"]) ? [element.body] : [],
	)
}

/** The block parsed as one JSON value, or `undefined` when it is not JSON at all. */
export function parsedBlock(block: string): unknown {
	try {
		return JSON.parse(block)
	} catch {
		return undefined
	}
}
