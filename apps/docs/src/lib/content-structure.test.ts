import { describe, expect, test } from "bun:test"
import {
	type ContentFile,
	type ContentStructureRule,
	checkContentStructure,
} from "./content-structure"
import { readContentTree } from "./content-tree-support"

const tree = await readContentTree()

function without(path: string): ContentFile[] {
	return tree.filter((file) => file.path !== path)
}

function withMeta(path: string, pages: readonly string[]): ContentFile[] {
	return tree.map((file) => {
		if (file.path !== path) {
			return file
		}
		const meta = JSON.parse(file.content) as Record<string, unknown>
		return { ...file, content: JSON.stringify({ ...meta, pages }) }
	})
}

function withContent(path: string, block: string): ContentFile[] {
	return tree.map((file) =>
		file.path === path ? { ...file, content: `${file.content}\n\n${block}\n` } : file,
	)
}

function withPageLink(path: string, link: string): ContentFile[] {
	return withContent(path, `[Broken](${link})`)
}

function rulesOf(files: readonly ContentFile[]): readonly ContentStructureRule[] {
	return checkContentStructure(files).map((problem) => problem.rule)
}

describe("Docs Portal content structure", () => {
	test("the authored content tree satisfies every structural rule", () => {
		expect(checkContentStructure(tree)).toEqual([])
	})

	test("a Tab without a landing page is reported", () => {
		expect(rulesOf(without("cli/index.mdx"))).toContain("tab-landing-page")
	})

	test("a Tab without a navigation file is reported", () => {
		expect(rulesOf(without("contribute/meta.json"))).toContain("tab-navigation")
	})

	test("a Tab missing from the content root navigation is reported", () => {
		expect(rulesOf(withMeta("meta.json", ["cli"]))).toContain("tab-listed")
	})

	test("a navigation entry with no page behind it is reported", () => {
		const pages = ["index", "installation", "configuration", "commands", "missing"]
		expect(rulesOf(withMeta("cli/meta.json", pages))).toContain("navigation-entry")
	})

	test("an internal link with no page behind it is reported", () => {
		expect(rulesOf(withPageLink("contribute/index.mdx", "/contribute/missing/"))).toContain(
			"internal-link",
		)
	})

	test("a JSX link with no page behind it is reported", () => {
		const link = '<a href="/contribute/missing/">Broken</a>'
		expect(rulesOf(withContent("contribute/index.mdx", link))).toContain("internal-link")
	})

	test("a link to the Landing Page at / needs no content page", () => {
		expect(rulesOf(withContent("contribute/index.mdx", "[Home](/)"))).not.toContain("internal-link")
	})
})
