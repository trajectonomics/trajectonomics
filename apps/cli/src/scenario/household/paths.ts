import { isPlainObject } from "../../json"
import { scenarioShapeProperties } from "../shape"
import { DATE } from "../shape/terms"

/**
 * Where an anchor may point, and how a path reaches a value inside a Scenario document
 * (cli ADR-0048). The anchorable paths are read from the published shape: a list whose items carry
 * an `id`, and a property of such an item whose description states a `DATE`. A milestone's date
 * qualifies the day the shape publishes it, with no change here.
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

/** One step of a document address: an object key, or a list item's position. */
export type Step = string | number

/** Where a path stops in the document, and the value there when the field is already stated. */
export type Locus =
	| { kind: "missing" }
	| { kind: "absent"; at: readonly Step[] }
	| { kind: "found"; at: readonly Step[]; value: unknown }

const MISSING: Locus = { kind: "missing" }

/** One level down: a key on an object, or the list item with that id. Null when it is not there. */
function enter(current: unknown, segment: string): { step: Step; next: unknown } | null {
	if (Array.isArray(current)) {
		const position = current.findIndex((item) => isPlainObject(item) && item["id"] === segment)
		return position === -1 ? null : { step: position, next: current[position] }
	}
	return isPlainObject(current) ? { step: segment, next: current[segment] } : null
}

/**
 * Follows `segments` through the document: a key on an object, an id in a list. A path that stops
 * at an item the document does not hold is `missing`; one that stops at a field it does not state
 * is `absent`, so the caller can fill it in.
 */
export function locate(document: unknown, segments: readonly string[]): Locus {
	let current: unknown = document
	const at: Step[] = []
	for (const [index, segment] of segments.entries()) {
		const entered = enter(current, segment)
		if (entered === null) return MISSING
		at.push(entered.step)
		if (entered.next === undefined)
			return index === segments.length - 1 ? { kind: "absent", at } : MISSING
		current = entered.next
	}
	return { kind: "found", at, value: current }
}

/** A copy of `node` with `value` at the address `steps`; the input is never mutated. */
export function setAt(node: unknown, steps: readonly Step[], value: unknown): unknown {
	const [step, ...rest] = steps
	if (step === undefined) return value
	if (typeof step === "number" && Array.isArray(node)) {
		const copy = [...node]
		copy[step] = setAt(node[step], rest, value)
		return copy
	}
	const object = isPlainObject(node) ? node : {}
	return { ...object, [String(step)]: setAt(object[String(step)], rest, value) }
}

/** The document path a refusal names: `document` plus the address, list positions as numbers. */
export function documentPathOf(steps: readonly Step[]): string {
	return ["document", ...steps.map(String)].join(".")
}
