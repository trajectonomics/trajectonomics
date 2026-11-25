import type { Json } from "./overrides"

/** Whether two JSON values are equal as data: an object's keys are compared by name, never by their order. */
export function sameJson(a: Json, b: Json): boolean {
	if (Array.isArray(a) || Array.isArray(b)) {
		return (
			Array.isArray(a) &&
			Array.isArray(b) &&
			a.length === b.length &&
			a.every((item, index) => sameJson(item, b[index] ?? null))
		)
	}
	if (a === null || b === null || typeof a !== "object" || typeof b !== "object") return a === b
	const keys = Object.keys(a)
	return (
		keys.length === Object.keys(b).length &&
		keys.every((key) => key in b && sameJson(a[key] ?? null, b[key] ?? null))
	)
}
