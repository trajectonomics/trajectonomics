import { describe, expect, test } from "bun:test"
import {
	chooseTranslation,
	DEFAULT_LANGUAGE,
	inBlogOrder,
	isLanguage,
	PREFIXED_LANGUAGES,
	perLanguage,
	treeOf,
	treePath,
} from "./languages"

describe("the Language Trees", () => {
	test("English is the root tree, and every other Language has a prefix", () => {
		expect(DEFAULT_LANGUAGE).toBe("en")
		expect(PREFIXED_LANGUAGES).toEqual(["th"])
	})

	test("a page's address in a tree", () => {
		expect(treePath("en", "/guides/a/")).toBe("/blog/guides/a/")
		expect(treePath("th", "/guides/a/")).toBe("/blog/th/guides/a/")
		expect(treePath("th", "/")).toBe("/blog/th/")
	})

	test("refuses a relative path", () => {
		expect(() => treePath("th", "guides/a/")).toThrow()
	})

	test("reads a built file's or a path's tree from its first segment", () => {
		expect(treeOf("index.html")).toBe("en")
		expect(treeOf("guides/a/index.html")).toBe("en")
		expect(treeOf("th/index.html")).toBe("th")
		expect(treeOf("/th/guides/a/")).toBe("th")
		expect(treeOf("/thai-tax/")).toBe("en")
	})

	test("knows only its own Languages", () => {
		expect(isLanguage("th")).toBe(true)
		expect(isLanguage("fr")).toBe(false)
	})

	test("gives one value per Language", () => {
		expect(perLanguage((language) => treePath(language, "/"))).toEqual({
			en: "/blog/",
			th: "/blog/th/",
		})
	})

	test("orders Languages the blog's way, each once", () => {
		expect(inBlogOrder(["th", "en", "th"])).toEqual(["en", "th"])
	})
})

describe("the Translation a page shows", () => {
	test("is the Interface Language when the Post is written in it", () => {
		expect(chooseTranslation(["en", "th"], "th")).toBe("th")
		expect(chooseTranslation(["en", "th"], "en")).toBe("en")
	})

	test("falls back to English when the Post is not in the Interface Language", () => {
		expect(chooseTranslation(["en"], "th")).toBe("en")
	})

	test("falls back to the Post's own Language when it has no English", () => {
		expect(chooseTranslation(["th"], "en")).toBe("th")
	})

	test("refuses a Post with no Translation", () => {
		expect(() => chooseTranslation([], "en")).toThrow()
	})
})
