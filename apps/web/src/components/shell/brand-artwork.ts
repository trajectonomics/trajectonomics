/**
 * The brand mark's SVG for the brand link. The link names itself, so the artwork is decoration: the
 * mark's own role and title are removed, and the SVG is hidden from focus.
 */
export function brandArtwork(mark: string): string {
	return mark
		.replace(' role="img"', "")
		.replace(/ aria-label="[^"]*"/, "")
		.replace(/<title>[\s\S]*?<\/title>/, "")
		.replace("<svg ", '<svg focusable="false" ')
}
