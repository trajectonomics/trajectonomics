import { DOCS_BASE_PATH } from "./tabs"

/**
 * The Mascot poses the Docs Portal draws. They are the Site's soft 3D renders, cut out of a green
 * screen and committed as transparent WebPs ([site ADR 0026][adr]), so the Portal makes no art of
 * its own. Only the poses the Portal places are here, not the Site's whole set.
 *
 * [adr]: https://github.com/trajectonomics/trajectonomics/blob/main/apps/site/docs/adr/0026-the-mascot-is-a-rendered-cut-out.md
 */
export const MASCOT_POSES = ["peek", "chart", "wave", "lost", "hello", "open", "tax"] as const

/** A pose the Docs Portal can draw. */
export type MascotPose = (typeof MASCOT_POSES)[number]

/**
 * The poses a docs page may name in its frontmatter, where the robot sits beside the page title.
 * A closed list, so a typo fails the build instead of drawing nothing.
 */
export const PAGE_MASCOT_POSES = [
	"chart",
	"hello",
	"open",
	"tax",
] as const satisfies readonly MascotPose[]

/** A pose a docs page picks with its `mascot` frontmatter field. */
export type PageMascotPose = (typeof PAGE_MASCOT_POSES)[number]

/** Each file's own size, so the box is reserved before it loads and nothing below it shifts. */
export const MASCOT_SIZE: Readonly<
	Record<MascotPose, { readonly width: number; readonly height: number }>
> = {
	peek: { width: 240, height: 161 },
	chart: { width: 176, height: 300 },
	wave: { width: 239, height: 340 },
	lost: { width: 221, height: 380 },
	hello: { width: 180, height: 120 },
	open: { width: 144, height: 203 },
	tax: { width: 144, height: 168 },
}

/** The public URL of a pose's WebP, under the Portal's base (`/docs`, ADR 0017). */
export function mascotUrl(pose: MascotPose): string {
	return `${DOCS_BASE_PATH}/mascot/${pose}.webp`
}
