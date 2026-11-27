/*
 * A `tree` fence becomes the page's picture of a directory: nested lists of real names, with a
 * glyph per entry that decoration only (aria-hidden), so a screen reader reads the same paths.
 * The Markdown twin keeps the fence as plain text for an agent.
 */

import type { HastNode, HastPlugin } from "./hast"
import { treeElement } from "./tree-markup"

/** The fence language this plugin turns: ```tree. */
const TREE_LANGUAGE = "language-tree"

/** What separates an entry from its short annotation. */
const NOTE_SEPARATOR = "  # "

/** One entry of a tree fence: a file or folder name, its note, and what it holds. */
export interface TreeEntry {
	readonly name: string
	readonly folder: boolean
	readonly note?: string | undefined
	readonly children: readonly TreeEntry[]
}

/** An entry while the fence's indentation is being turned into nesting. */
interface MutableEntry {
	readonly name: string
	readonly folder: boolean
	readonly note?: string | undefined
	readonly children: MutableEntry[]
}

/** The text of a hast subtree. */
function textOf(node: HastNode): string {
	if (node.type === "text") return node.value ?? ""
	return (node.children ?? []).map(textOf).join("")
}

/** The body of a `tree` fence, or undefined when this `pre` is not one. */
function fenceBody(node: HastNode): string | undefined {
	const [only] = node.children ?? []
	if (only?.tagName !== "code" && only?.tagName !== "pre") return undefined
	const classes = only.properties?.["className"]
	if (!Array.isArray(classes) || !classes.includes(TREE_LANGUAGE)) return undefined
	return textOf(only)
}

/** One line of the fence as an entry: its name, whether it is a folder, and its note. */
function entryOf(text: string): MutableEntry {
	const separator = text.indexOf(NOTE_SEPARATOR)
	const label = (separator === -1 ? text : text.slice(0, separator)).trim()
	const note = separator === -1 ? undefined : text.slice(separator + NOTE_SEPARATOR.length).trim()
	const folder = label.endsWith("/")
	return {
		name: folder ? label.slice(0, -1) : label,
		folder,
		...(note === undefined || note === "" ? {} : { note }),
		children: [],
	}
}

/** The entries a tree fence names, nested by two spaces per level. */
export function parseTree(body: string): readonly TreeEntry[] {
	const roots: TreeEntry[] = []
	const stack: { readonly level: number; readonly entry: MutableEntry }[] = []
	for (const line of body.split("\n")) {
		if (line.trim() === "") continue
		const level = Math.floor((line.length - line.trimStart().length) / 2)
		while ((stack.at(-1)?.level ?? -1) >= level) stack.pop()
		const entry = entryOf(line.trim())
		const parent = stack.at(-1)?.entry
		if (parent === undefined) roots.push(entry)
		else parent.children.push(entry)
		stack.push({ level, entry })
	}
	return roots
}

/** The hast plugin that turns every `tree` fence into nested lists, before the highlighter sees it. */
export function treeFences(): HastPlugin {
	return {
		name: "docs-tree-fences",
		element: {
			filter: ["pre"],
			visit(node, context) {
				const body = fenceBody(node)
				if (body === undefined) return
				const entries = parseTree(body)
				if (entries.length === 0) return
				context.replaceNode(node, treeElement(entries))
			},
		},
	}
}
