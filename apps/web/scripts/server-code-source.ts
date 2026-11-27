/**
 * A Dashboard source as the code scan reads it: `.ts` files as they are, and only the `<script>` blocks of a
 * `.svelte` file, so markup and comments cannot state a code. Pure: the test passes the sources in.
 */
import ts from "typescript"

/** One source file: its path from `apps/web`, and its text. */
export interface Source {
	readonly file: string
	readonly text: string
}

/** A source's TypeScript trees: one for a `.ts`, and one per script block for a `.svelte`. */
export interface ParsedSource {
	readonly file: string
	readonly trees: readonly ts.SourceFile[]
}

/** A `<script>` block, with whatever attributes its tag states. */
const SCRIPT = /<script\b[^>]*>([\s\S]*?)<\/script>/g

/** A tree of a source's text, parsed but not type-checked: the scan reads shapes, not types. */
function tree(file: string, text: string): ts.SourceFile {
	return ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true)
}

/** The trees a source's code lives in; a `.svelte` file's markup is not code and is left out. */
export function parseSource(source: Source): ParsedSource {
	const file = source.file
	if (!file.endsWith(".svelte")) return { file, trees: [tree(file, source.text)] }
	const blocks = [...source.text.matchAll(SCRIPT)].flatMap((match) =>
		match[1] === undefined ? [] : [match[1]],
	)
	return { file, trees: blocks.map((text, index) => tree(`${file}#script${index}.ts`, text)) }
}

/** Every node of a tree, parents before children. */
export function walk(node: ts.Node, visit: (node: ts.Node) => void): void {
	visit(node)
	node.forEachChild((child) => walk(child, visit))
}
