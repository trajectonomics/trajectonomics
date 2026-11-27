import { isPlainObject } from "../../json"
import { scenarioShapeProperties } from "../shape"
import { DATE } from "../shape/terms"

/**
 * Where an anchor may point (cli ADR-0048). The anchorable paths are read from the published shape:
 * a list whose items carry an `id`, and a property of such an item whose description states a
 * `DATE`. A milestone's date qualifies the day the shape publishes it, with no change here.
 */

const WILDCARD = "*"

/** A list of items addressed by id: an array whose items declare `properties.id`. */
function isIdList(schema: Record<string, unknown>): boolean {
	const items = schema["items"]
	return (
		schema["type"] === "array" &&
		isPlainObject(items) &&
		isPlainObject(items["properties"]) &&
		"id" in items["properties"]
	)
}

function patternsOf(
	list: Record<string, unknown>,
	prefix: readonly string[],
	out: string[][],
): void {
	const items = list["items"] as Record<string, unknown>
	const properties = items["properties"] as Record<string, unknown>
	for (const [key, property] of Object.entries(properties)) {
		if (key === "id" || !isPlainObject(property)) continue
		const pattern = [...prefix, WILDCARD, key]
		const description = property["description"]
		if (
			property["type"] === "string" &&
			typeof description === "string" &&
			description.includes(DATE)
		) {
			out.push(pattern)
		} else if (isIdList(property)) {
			patternsOf(property, pattern, out)
		}
	}
}

function derive(): readonly (readonly string[])[] {
	const out: string[][] = []
	for (const [key, property] of Object.entries(scenarioShapeProperties(undefined))) {
		if (isPlainObject(property) && isIdList(property)) patternsOf(property, [key], out)
	}
	return out
}

/** Every anchorable pattern; `*` stands for an item's id. */
export const ANCHORABLE: readonly (readonly string[])[] = derive()

/** Whether a dotted path's segments name a date field the shape publishes. */
export function anchorableSegments(segments: readonly string[]): boolean {
	return ANCHORABLE.some(
		(pattern) =>
			pattern.length === segments.length &&
			pattern.every((part, index) => part === WILDCARD || part === segments[index]),
	)
}

/** The anchorable paths as a person writes them, for a refusal's hint. */
export function anchorableHint(): string {
	return ANCHORABLE.map((pattern) =>
		pattern.map((part) => (part === WILDCARD ? "<id>" : part)).join("."),
	).join(", ")
}
