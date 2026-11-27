/** The attributes the artwork names itself with; the link around it carries the name instead. */
const NAMED_ATTRIBUTE = /\s(?:role|aria-label)="[^"]*"/g

/** The artwork's own `<title>`, which would name the link a second time. */
const ARTWORK_TITLE = /<title>[\s\S]*?<\/title>/

/** The opening tag that takes the decoration attributes. */
const ARTWORK_OPEN = /<svg\b/

/**
 * The brand mark as decoration: the link around it names itself, so the artwork's own role, label
 * and title go, and its viewBox and paths stay because they draw it. Every static site calls this,
 * so none of them keeps a private copy of the replace chain.
 */
export function decorativeMark(svg: string): string {
	return svg
		.replace(NAMED_ATTRIBUTE, "")
		.replace(ARTWORK_TITLE, "")
		.replace(ARTWORK_OPEN, '<svg aria-hidden="true" focusable="false"')
}
