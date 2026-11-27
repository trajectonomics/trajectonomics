import { isPlainObject } from "../json"
import { branchOf, fieldKindOf, isNode, type Node } from "./field-paths"

/*
 * The values `--decimal` converts in a document (ADR-0047): every money field and every rate it
 * writes as a percent, such as an Account's `fee.bps`. The walk follows the schema exactly as the
 * converter does, so a hint can ask what the flag would do to the rest of the input without
 * restating which fields it reads (cli ADR-0063, ADR-0067).
 */

/** The children of a schema node and its value: an `anyOf` branch, an object's keys, or a list's items. */
function childrenOf(schema: Node, value: unknown): [unknown, unknown][] {
	if (Array.isArray(schema["anyOf"])) return [[branchOf(schema["anyOf"], value), value]]
	const properties = schema["properties"]
	if (isNode(properties) && isPlainObject(value)) {
		return Object.entries(properties).flatMap(([key, child]) =>
			Object.hasOwn(value, key) ? [[child, value[key]] as [unknown, unknown]] : [],
		)
	}
	if (!Array.isArray(value) || schema["items"] === undefined) return []
	return value.map((item) => [schema["items"], item])
}

/** Every value the decimal form converts in `value`, walking the schema `schema`. */
export function convertedValuesOf(schema: unknown, value: unknown): unknown[] {
	return collect(schema, value, [])
}

function collect(schema: unknown, value: unknown, found: unknown[]): unknown[] {
	if (!isNode(schema)) return found
	if (fieldKindOf(schema) !== undefined) {
		found.push(value)
		return found
	}
	for (const [child, childValue] of childrenOf(schema, value)) {
		collect(child, childValue, found)
	}
	return found
}
