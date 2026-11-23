import { describe, expect, test } from "bun:test"
import { groupTranslations, type TranslationFacts, translationPlace } from "./translations"

/** One Translation of the Post `a`, which each test varies. */
function translation(overrides: Partial<TranslationFacts> = {}): TranslationFacts {
	return {
		slug: "a",
		language: "en",
		type: "guide",
		publishedOn: new Date("2026-11-22"),
		draft: false,
		cover: { src: "/posts/a/cover.webp", width: 1200, height: 630 },
		...overrides,
	}
}

describe("a Translation's place", () => {
	test("is its Post's slug, then its Language", () => {
		expect(translationPlace("one-answer-every-time/th")).toEqual({
			slug: "one-answer-every-time",
			language: "th",
		})
	})

	test("refuses a file outside a Post's folder", () => {
		expect(() => translationPlace("one-answer-every-time")).toThrow("<slug>/<language>.md")
	})

	test("refuses a Language the blog does not know", () => {
		expect(() => translationPlace("a/fr")).toThrow('"fr"')
	})
})

describe("grouping Translations into Posts", () => {
	test("gathers one Post's Translations, in the blog's Language order", () => {
		const [post, ...rest] = groupTranslations([translation({ language: "th" }), translation()])
		expect(rest).toEqual([])
		expect(post?.languages).toEqual(["en", "th"])
		expect(post?.translations.get("th")?.language).toBe("th")
	})

	test("keeps each Post apart", () => {
		const posts = groupTranslations([translation(), translation({ slug: "b", language: "th" })])
		expect(posts.map((post) => [post.slug, post.languages])).toEqual([
			["a", ["en"]],
			["b", ["th"]],
		])
	})

	test("refuses Translations that disagree on a shared fact", () => {
		const cases: readonly [Partial<TranslationFacts>, string][] = [
			[{ type: "news" }, "type"],
			[{ publishedOn: new Date("2026-11-23") }, "publishedOn"],
			[{ draft: true }, "draft"],
			[{ cover: { src: "/posts/a/other.webp", width: 1200, height: 630 } }, "cover.src"],
			[{ cover: { src: "/posts/a/cover.webp", width: 1024, height: 1024 } }, "cover size"],
		]
		for (const [override, fact] of cases) {
			expect(() =>
				groupTranslations([translation(), translation({ language: "th", ...override })]),
			).toThrow(fact)
		}
	})
})
