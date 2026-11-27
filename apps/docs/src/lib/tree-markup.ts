/*
 * The markup of a `tree` picture: a hairline indent per level, a folder or file glyph that only
 * decorates, the name as text, and its note muted beside it.
 */

import type { HastNode } from "./hast"
import type { TreeEntry } from "./tree-fence"

/** A folder glyph: a tabbed folder outline. */
const FOLDER_PATH = "M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"

/** A file glyph: a sheet with a folded corner. */
const FILE_PATHS = ["M7 3h7l5 5v13H7Z", "M14 3v5h5"]

/** One glyph, hidden from a screen reader because the name beside it carries the meaning. */
function glyph(folder: boolean): HastNode {
	const paths = folder ? [FOLDER_PATH] : FILE_PATHS
	return {
		type: "element",
		tagName: "svg",
		properties: {
			ariaHidden: true,
			focusable: "false",
			viewBox: "0 0 24 24",
			fill: "none",
			stroke: "currentColor",
			strokeWidth: 1.5,
			strokeLinecap: "round",
			strokeLinejoin: "round",
			className: ["docs-tree-glyph"],
		},
		children: paths.map((d) => ({
			type: "element",
			tagName: "path",
			properties: { d },
			children: [],
		})),
	}
}

/** A span of text with its classes. */
function span(className: readonly string[], value: string): HastNode {
	return {
		type: "element",
		tagName: "span",
		properties: { className: [...className] },
		children: [{ type: "text", value }],
	}
}

/** One entry: its row, then its children as a nested list when it has any. */
function entryElement(entry: TreeEntry): HastNode {
	const row: HastNode = {
		type: "element",
		tagName: "span",
		properties: { className: ["docs-tree-row"] },
		children: [
			glyph(entry.folder),
			span(["docs-tree-name", "font-mono"], entry.name),
			...(entry.note === undefined ? [] : [span(["docs-tree-note", "text-sm"], entry.note)]),
		],
	}
	return {
		type: "element",
		tagName: "li",
		children:
			entry.children.length === 0
				? [row]
				: [
						row,
						{
							type: "element",
							tagName: "ul",
							properties: { className: ["docs-tree"] },
							children: entry.children.map(entryElement),
						},
					],
	}
}

/** The whole tree: a list with its own accessible name, nested one list per folder. */
export function treeElement(entries: readonly TreeEntry[]): HastNode {
	return {
		type: "element",
		tagName: "ul",
		properties: { className: ["docs-tree"], ariaLabel: "File tree" },
		children: entries.map(entryElement),
	}
}
