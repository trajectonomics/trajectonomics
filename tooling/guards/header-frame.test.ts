import { describe, expect, test } from "bun:test"
import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"

/**
 * The four static sites that draw the one header frame. Each keeps its own nav items, but not its
 * own tile, columns or menu: the frame, the tile and the mark stripper come from this package, the
 * header and the Language menu from `@trajectonomics/site-header`, and a local copy is how the sites
 * drift apart again.
 */
const APP_ROOTS = ["apps/site/src", "apps/blog/src", "apps/data/src", "apps/docs/src"] as const

/** The Astro sites: the ones that render `@trajectonomics/site-header` rather than the shared classes. */
const ASTRO_ROOTS = ["apps/site/src", "apps/blog/src", "apps/data/src"] as const

/** The files that can paint: stylesheets, Astro components, React components and Svelte components. */
const PAINTING = /\.(?:css|astro|tsx|svelte)$/

/** The repo root, from `tooling/guards/`. */
const REPO_ROOT = join(import.meta.dir, "..", "..")

/** The old local tile class, and the shared one used as a selector rather than in markup. */
const LOCAL_TILE = [".brand-tile", ".ds-brand-tile"]

/** The local copy of the mark-stripping chain, which belongs in `decorative-mark.ts` only. */
const MARK_STRIPPER = String.raw`<title>[\s\S]*?<\/title>`

/** A definition of one of the shared header columns, or of the Language menu. */
const SHARED_SELECTOR = /\.(?:ds-header-|header-menu)/

/** A column of the shared header, spelled as markup rather than through `SiteHeader`'s slots. */
const SHARED_MARKUP = /class="[^"]*\bds-header-(?:start|nav|end)\b/

/** An Astro component's own `<style>` block, where a rule can hide from a stylesheet scan. */
const STYLE_BLOCK = /<style\b[^>]*>([\s\S]*?)<\/style>/g

/** Every file under one root, as a path relative to the repo root. */
function filesUnder(root: string): readonly string[] {
	return readdirSync(join(REPO_ROOT, root), { recursive: true, encoding: "utf8" })
		.filter((file) => PAINTING.test(file))
		.map((file) => join(root, file))
}

/** Every paintable file of the four apps, as a path relative to the repo root. */
function appFiles(): readonly string[] {
	return APP_ROOTS.flatMap(filesUnder)
}

/** Every Astro file of the three Astro sites. */
function astroFiles(): readonly string[] {
	return ASTRO_ROOTS.flatMap(filesUnder).filter((file) => file.endsWith(".astro"))
}

/** The text of one file. */
function sourceOf(file: string): string {
	return readFileSync(join(REPO_ROOT, file), "utf8")
}

/** Why one file fails the guard, or `undefined` when it keeps the shared frame. */
function localHeaderCopy(file: string): string | undefined {
	const source = sourceOf(file)
	const tile = LOCAL_TILE.find((selector) => source.includes(selector))
	if (tile !== undefined)
		return `defines ${tile}; use the shared class from @trajectonomics/brand/header.css`
	if (source.includes(MARK_STRIPPER)) return "carries a local copy of the mark-stripping chain"
	return undefined
}

/** Why one file defines a shared header rule, or `undefined` when it leaves that to the packages. */
function sharedRuleCopy(file: string): string | undefined {
	const source = sourceOf(file)
	if (file.endsWith(".css")) {
		return SHARED_SELECTOR.test(source)
			? "defines a .ds-header-* or .header-menu rule; keep it in packages/brand or packages/site-header"
			: undefined
	}
	for (const [, block = ""] of source.matchAll(STYLE_BLOCK)) {
		if (SHARED_SELECTOR.test(block)) {
			return "defines a .ds-header-* or .header-menu rule in a <style> block; keep it in packages/brand or packages/site-header"
		}
	}
	return undefined
}

/** Why one Astro file renders a shared column itself, or `undefined` when it uses `SiteHeader`. */
function sharedMarkupCopy(file: string): string | undefined {
	return SHARED_MARKUP.test(sourceOf(file))
		? "renders a .ds-header-start/nav/end column itself; render @trajectonomics/site-header instead"
		: undefined
}

describe("the one header frame", () => {
	const files = appFiles()

	test("has files to check", () => {
		expect(files.length).toBeGreaterThan(0)
	})

	test.each(files)("%s keeps no local copy of the header frame", (file) => {
		expect(localHeaderCopy(file)).toBeUndefined()
	})

	test.each(files)("%s defines no shared header rule of its own", (file) => {
		expect(sharedRuleCopy(file)).toBeUndefined()
	})

	test.each(astroFiles())("%s renders no shared header column itself", (file) => {
		expect(sharedMarkupCopy(file)).toBeUndefined()
	})
})
