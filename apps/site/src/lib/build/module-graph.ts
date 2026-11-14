/** A static `import`, with or without names and `from`, in the form a build emits. */
const IMPORT = /\bimport\s*(?:[^"'()]*?\s*from\s*)?["']([^"']+)["']/g

/** A static re-export, such as `export * from "./chunk.js"`. */
const EXPORT_FROM = /\bexport\s+[^"'();]*?\s+from\s*["']([^"']+)["']/g

/** The specifiers a script names in its static imports and re-exports, in no particular order. */
export function staticImportPaths(script: string): readonly string[] {
	return [...script.matchAll(IMPORT), ...script.matchAll(EXPORT_FROM)].flatMap((match) => {
		const path = match[1]
		return path === undefined ? [] : [path]
	})
}
