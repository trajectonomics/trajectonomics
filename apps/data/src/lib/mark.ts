/**
 * The brand mark as decoration: the link around it names itself, so the artwork's own role, label
 * and title go, and its viewBox and paths stay because they draw it.
 */
export function decorativeMark(svg: string): string {
	return svg
		.replace(' role="img"', "")
		.replace(/ aria-label="[^"]*"/, "")
		.replace(/<title>[\s\S]*?<\/title>/, "")
		.replace("<svg ", '<svg aria-hidden="true" focusable="false" ')
}
