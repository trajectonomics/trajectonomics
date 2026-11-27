import { isAppError } from "../errors"
import { isPlainObject } from "../json"
import { branchOf, type FieldKind, fieldKindOf, isNode, type Node } from "./field-paths"

/*
 * The walk the decimal form makes over a document (ADR-0047): each field of the published schema
 * that is money or a rate the flag writes as a percent, converted by the caller's callback. Kept
 * apart from `decimal.ts` and `money-fields.ts` so the hint that asks what `--decimal` would do to
 * the rest of the input shares this walk instead of copying it (cli ADR-0063, ADR-0067).
 */

/** The element a document path names: a list item's `id` when it has one, otherwise its index. */
function elementKey(item: unknown, index: number): string {
	const id = isPlainObject(item) ? item["id"] : undefined
	return typeof id === "string" ? id : String(index)
}

export type Convert = (value: unknown, path: readonly string[], kind: FieldKind) => unknown

/**
 * Walks a value beside its schema and converts each field the schema marks as money or as a rule's
 * rate (cli ADR-0063). Only the keys a value holds are visited, so an absent optional field stays
 * absent. A failure stops the walk and is returned as the value, so the caller checks `isAppError`
 * once.
 */
export function mapDecimalFields(
	schema: unknown,
	value: unknown,
	path: readonly string[],
	convert: Convert,
): unknown {
	if (!isNode(schema)) return value
	const kind = fieldKindOf(schema)
	if (kind !== undefined) return convert(value, path, kind)
	if (Array.isArray(schema["anyOf"])) {
		return mapDecimalFields(branchOf(schema["anyOf"], value), value, path, convert)
	}
	if (isNode(schema["properties"]) && isPlainObject(value)) {
		return mapFields(schema["properties"], value, path, convert)
	}
	if (schema["items"] !== undefined && Array.isArray(value)) {
		return mapItems(schema["items"], value, path, convert)
	}
	return value
}

function mapFields(properties: Node, value: Node, path: readonly string[], convert: Convert) {
	const out: Node = { ...value }
	for (const [key, child] of Object.entries(properties)) {
		if (!Object.hasOwn(value, key)) continue
		const next = mapDecimalFields(child, value[key], [...path, key], convert)
		if (isAppError(next)) return next
		out[key] = next
	}
	return out
}

function mapItems(items: unknown, list: unknown[], path: readonly string[], convert: Convert) {
	const out: unknown[] = []
	for (const [index, item] of list.entries()) {
		const next = mapDecimalFields(items, item, [...path, elementKey(item, index)], convert)
		if (isAppError(next)) return next
		out.push(next)
	}
	return out
}
