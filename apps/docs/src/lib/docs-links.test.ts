import { describe, expect, test } from "bun:test"
import { prefixDocsLinks, withDocsBase } from "./docs-links"
import type { HastNode } from "./hast"

describe("a root-relative link in authored content", () => {
	test.each([
		["/cli/commands/", "/docs/cli/commands/"],
		["/contribute/tax/", "/docs/contribute/tax/"],
		["/operators", "/docs/operators"],
	])("a Portal link gains the base: %s", (href, expected) => {
		expect(withDocsBase(href)).toBe(expected)
	})

	test.each([
		["/docs/", "/docs/"],
		["/docs/cli/", "/docs/cli/"],
		["/", "/"],
		["/blog/launch/", "/blog/launch/"],
		["/data/", "/data/"],
	])("a Site path or a path that already carries the base stays: %s", (href, expected) => {
		expect(withDocsBase(href)).toBe(expected)
	})

	test.each([
		["https://example.com/", "https://example.com/"],
		["#top", "#top"],
		["//cdn/x", "//cdn/x"],
	])("a link that is not a site path is untouched: %s", (href, expected) => {
		expect(withDocsBase(href)).toBe(expected)
	})
})

describe("the Markdown link plugin", () => {
	test("rewrites an anchor into the Portal and leaves a Site link alone", () => {
		const node: HastNode = {
			type: "element",
			tagName: "a",
			properties: { href: "/cli/" },
			children: [],
		}
		const replaced: HastNode[] = []
		prefixDocsLinks().element.visit(node, {
			replaceNode(_node, next) {
				replaced.push(...(Array.isArray(next) ? next : [next]))
			},
		})

		expect(replaced[0]?.properties?.["href"]).toBe("/docs/cli/")
	})

	test("does not replace a link the base already covers", () => {
		const node: HastNode = {
			type: "element",
			tagName: "a",
			properties: { href: "/docs/cli/" },
			children: [],
		}
		let replaced = false
		prefixDocsLinks().element.visit(node, {
			replaceNode() {
				replaced = true
			},
		})

		expect(replaced).toBe(false)
	})
})
