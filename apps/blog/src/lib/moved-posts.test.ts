import { describe, expect, test } from "bun:test"
import { MOVED_POSTS, movedPostRedirects, redirectsFile } from "./moved-posts"

describe("moved Post redirects", () => {
	test("generates slashed and unslashed 301 rules in every Language Tree", () => {
		const rules = movedPostRedirects([{ slug: "a", from: "guide", to: "compare" }])
		expect(rules).toEqual([
			{ from: "/blog/guides/a/", to: "/blog/compare/a/" },
			{ from: "/blog/guides/a", to: "/blog/compare/a/" },
			{ from: "/blog/th/guides/a/", to: "/blog/th/compare/a/" },
			{ from: "/blog/th/guides/a", to: "/blog/th/compare/a/" },
		])
	})

	test("points every former address straight to the latest type after a second move", () => {
		const rules = movedPostRedirects([
			{ slug: "a", from: "guide", to: "compare" },
			{ slug: "a", from: "compare", to: "essay" },
		])
		expect(rules).toEqual([
			{ from: "/blog/guides/a/", to: "/blog/essays/a/" },
			{ from: "/blog/guides/a", to: "/blog/essays/a/" },
			{ from: "/blog/th/guides/a/", to: "/blog/th/essays/a/" },
			{ from: "/blog/th/guides/a", to: "/blog/th/essays/a/" },
			{ from: "/blog/compare/a/", to: "/blog/essays/a/" },
			{ from: "/blog/compare/a", to: "/blog/essays/a/" },
			{ from: "/blog/th/compare/a/", to: "/blog/th/essays/a/" },
			{ from: "/blog/th/compare/a", to: "/blog/th/essays/a/" },
		])
	})

	test("drops the current address from sources when a Post moves back to an earlier type", () => {
		const rules = movedPostRedirects([
			{ slug: "a", from: "guide", to: "compare" },
			{ slug: "a", from: "compare", to: "guide" },
		])
		expect(rules).toEqual([
			{ from: "/blog/compare/a/", to: "/blog/guides/a/" },
			{ from: "/blog/compare/a", to: "/blog/guides/a/" },
			{ from: "/blog/th/compare/a/", to: "/blog/th/guides/a/" },
			{ from: "/blog/th/compare/a", to: "/blog/th/guides/a/" },
		])
	})

	test("formats a Workers Static Assets _redirects file with 301 status", () => {
		const text = redirectsFile([{ from: "/blog/guides/a/", to: "/blog/essays/a/" }])
		expect(text).toBe("/blog/guides/a/ /blog/essays/a/ 301\n")
	})

	test("never lists the same from-type and to-type", () => {
		for (const post of MOVED_POSTS) {
			expect(post.from).not.toBe(post.to)
		}
	})
})
