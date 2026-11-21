/** One place two JSON values differ: the path to it, and the value on each side. */
export interface Difference {
	/** The path to the value, such as `@graph.0.url`, or `""` when the values themselves differ. */
	readonly at: string
	readonly stated: unknown
	readonly written: unknown
}

/** The value kind the difference walk compares, with `absent` for a key one side does not carry. */
function kindOf(value: unknown): string {
	if (value === undefined) return "absent"
	if (value === null) return "null"
	if (Array.isArray(value)) return "array"
	return typeof value
}

/** The value at one key or index, or `undefined` when the node carries none. */
function valueAt(node: unknown, key: string): unknown {
	return typeof node === "object" && node !== null
		? (node as Readonly<Record<string, unknown>>)[key]
		: undefined
}

/** Every path at which the written value differs from the stated one, objects and arrays walked. */
function differences(at: string, stated: unknown, written: unknown): readonly Difference[] {
	const kind = kindOf(stated)
	if (kind !== kindOf(written)) return [{ at, stated, written }]
	if (kind !== "object" && kind !== "array")
		return stated === written ? [] : [{ at, stated, written }]
	const keys = new Set([...Object.keys(stated as object), ...Object.keys(written as object)])
	return [...keys].flatMap((key) =>
		differences(at === "" ? key : `${at}.${key}`, valueAt(stated, key), valueAt(written, key)),
	)
}

/** Every path at which one JSON value differs from another, with no path when they agree. */
export function jsonDifferences(stated: unknown, written: unknown): readonly Difference[] {
	return differences("", stated, written)
}
