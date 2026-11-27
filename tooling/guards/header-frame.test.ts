import { describe, expect, test } from "bun:test"
import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"

/**
 * The four static sites that draw the one header frame. Each keeps its own nav items, but not its
 * own tile: the frame, the tile and the mark stripper come from this package, and a local copy is
 * how the sites drift apart again.
 */
const APP_ROOTS = ["apps/site/src", "apps/blog/src", "apps/data/src", "apps/docs/src"] as const

/** The files that can paint: stylesheets, Astro components, React components and Svelte components. */
const PAINTING = /\.(?:css|astro|tsx|svelte)$/

/** The repo root, from `tooling/guards/`. */
const REPO_ROOT = join(import.meta.dir, "..", "..")

/** The old local tile class, and the shared one used as a selector rather than in markup. */
const LOCAL_TILE = [".brand-tile", ".ds-brand-tile"]

/** The local copy of the mark-stripping chain, which belongs in `decorative-mark.ts` only. */
const MARK_STRIPPER = String.raw`<title>[\s\S]*?<\/title>`

/** Every paintable file of the four apps, as a path relative to the repo root. */
function appFiles(): readonly string[] {
	return APP_ROOTS.flatMap((root) =>
		readdirSync(join(REPO_ROOT, root), { recursive: true, encoding: "utf8" })
			.filter((file) => PAINTING.test(file))
			.map((file) => join(root, file)),
	)
}

/** Why one file fails the guard, or `undefined` when it keeps the shared frame. */
function localHeaderCopy(file: string): string | undefined {
	const source = readFileSync(join(REPO_ROOT, file), "utf8")
	const tile = LOCAL_TILE.find((selector) => source.includes(selector))
	if (tile !== undefined)
		return `defines ${tile}; use the shared class from @trajectonomics/brand/header.css`
	if (source.includes(MARK_STRIPPER)) return "carries a local copy of the mark-stripping chain"
	return undefined
}

describe("the one header frame", () => {
	const files = appFiles()

	test("has files to check", () => {
		expect(files.length).toBeGreaterThan(0)
	})

	test.each(files)("%s keeps no local copy of the header frame", (file) => {
		expect(localHeaderCopy(file)).toBeUndefined()
	})
})
