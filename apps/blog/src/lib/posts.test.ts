import { describe, expect, test } from "bun:test"
import {
	displayDate,
	type PostSummary,
	postPath,
	publishedNewestFirst,
	readingMinutes,
} from "./posts"

/** A published guide, which each test varies. */
function post(slug: string, publishedOn: string, draft = false): PostSummary {
	return { slug, type: "guide", publishedOn: new Date(publishedOn), draft }
}

describe("a Post's address", () => {
	test("a guide lives under /guides/", () => {
		expect(postPath({ slug: "one-answer-every-time", type: "guide" })).toBe(
			"/guides/one-answer-every-time/",
		)
	})

	test("a compare page lives under /compare/", () => {
		expect(postPath({ slug: "traj-vs-vanilla-agents", type: "compare" })).toBe(
			"/compare/traj-vs-vanilla-agents/",
		)
	})

	test("news lives under /news/", () => {
		expect(postPath({ slug: "launch", type: "news" })).toBe("/news/launch/")
	})
})

describe("the Posts a reader sees", () => {
	test("are newest first", () => {
		const posts = [post("old", "2026-01-01"), post("new", "2026-11-22")]
		expect(publishedNewestFirst(posts).map((p) => p.slug)).toEqual(["new", "old"])
	})

	test("never include a draft", () => {
		const posts = [post("live", "2026-01-01"), post("draft", "2026-11-22", true)]
		expect(publishedNewestFirst(posts).map((p) => p.slug)).toEqual(["live"])
	})

	test("leave the caller's list as it was", () => {
		const posts = [post("old", "2026-01-01"), post("new", "2026-11-22")]
		publishedNewestFirst(posts)
		expect(posts.map((p) => p.slug)).toEqual(["old", "new"])
	})
})

describe("the reading time", () => {
	test("is whole minutes at 220 words a minute, rounded up", () => {
		expect(readingMinutes("word ".repeat(221), "en")).toBe(2)
	})

	test("is never less than one minute", () => {
		expect(readingMinutes("", "en")).toBe(1)
	})

	test("counts Thai words, which have no space between them", () => {
		// สวัสดีครับ is two words and one run of letters; whitespace alone would count 221.
		expect(readingMinutes("สวัสดีครับ ".repeat(221), "th")).toBe(3)
	})
})

describe("the publication date", () => {
	test("reads as day, short month and year, whatever the reader's time zone", () => {
		expect(displayDate(new Date("2026-11-22"), "en-GB")).toBe("22 Nov 2026")
	})

	test("reads in the Thai calendar for a Thai reader", () => {
		expect(displayDate(new Date("2026-11-22"), "th-TH")).toBe("22 พ.ย. 2569")
	})
})
