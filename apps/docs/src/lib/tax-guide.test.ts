import { describe, expect, test } from "bun:test"
import { existsSync } from "node:fs"
import { join, resolve } from "node:path"
import {
	REPOSITORY_BLOB_URL,
	renderTaxGuidePage,
	TAX_GUIDE_PAGE,
	TAX_GUIDE_SOURCE,
} from "./tax-guide"

const APP_DIR = resolve(import.meta.dir, "../..")
const REPO_ROOT = resolve(APP_DIR, "../..")

const source = await Bun.file(join(REPO_ROOT, TAX_GUIDE_SOURCE)).text()
const committed = await Bun.file(join(APP_DIR, TAX_GUIDE_PAGE)).text()

/** The repository path a GitHub link on `main` names, or `undefined` for any other link. */
function repoPathOf(target: string): string | undefined {
	return target.startsWith(REPOSITORY_BLOB_URL)
		? target.slice(REPOSITORY_BLOB_URL.length)
		: undefined
}

/** Every link target in a page. */
function targetsOf(page: string): readonly string[] {
	return [...page.matchAll(/\]\(([^)\s]+)\)/g)].map((match) => match[1] ?? "")
}

describe("the generated tax guide page", () => {
	test("is up to date with the guide it is generated from", () => {
		const expected = renderTaxGuidePage(source)
		if (committed !== expected) {
			throw new Error(
				`${TAX_GUIDE_PAGE} is out of date with ${TAX_GUIDE_SOURCE}: run \`bun run sync:tax-guide\``,
			)
		}
		expect(committed).toBe(expected)
	})

	test("carries the frontmatter Fumadocs titles the page by, and no second title line", () => {
		expect(committed.startsWith("---\ntitle: Tax contributor guide\n")).toBe(true)
		expect(committed).not.toContain("\n# Contributing tax rules")
	})

	test("links every guide link that points into the repository to main, and the target exists", () => {
		const repoLinks = targetsOf(committed)
			.map(repoPathOf)
			.filter((path): path is string => path !== undefined)
		expect(repoLinks.length).toBeGreaterThan(0)
		expect(repoLinks.filter((path) => !existsSync(join(REPO_ROOT, path)))).toEqual([])
	})

	test("keeps no relative link, so no link breaks outside GitHub", () => {
		expect(targetsOf(committed).filter((target) => target.startsWith("."))).toEqual([])
	})

	test("leaves same-page anchors and external links as they are", () => {
		const links = targetsOf(committed)
		expect(links).toContain("#checking-your-change")
		expect(links.some((target) => target.startsWith("https://"))).toBe(true)
	})
})
