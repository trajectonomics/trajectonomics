import { describe, expect, test } from "bun:test"
import { oldHostRedirect } from "./redirect"

/** A request to the blog's old host, the address every old link uses. */
function oldHost(path: string, method = "GET"): Request {
	return new Request(`https://blog.trajectonomics.com${path}`, { method })
}

/** The Location of the redirect a request answers with, or `undefined` when it does not redirect. */
function locationOf(request: Request): string | undefined {
	return oldHostRedirect(request)?.headers.get("location") ?? undefined
}

describe("the old blog host", () => {
	test("sends its root to the blog's front page under the Site", () => {
		expect(locationOf(oldHost("/"))).toBe("https://trajectonomics.com/blog/")
	})

	test("keeps a deep path, with its trailing slash", () => {
		expect(locationOf(oldHost("/guides/one-answer-every-time/"))).toBe(
			"https://trajectonomics.com/blog/guides/one-answer-every-time/",
		)
	})

	test("keeps a query string", () => {
		expect(locationOf(oldHost("/guides/a/?utm_source=old&page=2"))).toBe(
			"https://trajectonomics.com/blog/guides/a/?utm_source=old&page=2",
		)
	})

	test("does not put the base on a path that already has it", () => {
		expect(locationOf(oldHost("/blog/guides/a/"))).toBe("https://trajectonomics.com/blog/guides/a/")
		expect(locationOf(oldHost("/blog"))).toBe("https://trajectonomics.com/blog")
	})

	test("answers HEAD as well as GET", () => {
		expect(locationOf(oldHost("/", "HEAD"))).toBe("https://trajectonomics.com/blog/")
	})

	test("is a 301, the permanent redirect", () => {
		expect(oldHostRedirect(oldHost("/"))?.status).toBe(301)
	})

	test("does not redirect another host, so the Site, previews and localhost serve normally", () => {
		for (const host of [
			"https://trajectonomics.com/blog/",
			"https://example.com/",
			"http://localhost:4321/blog/",
			"https://www.blog.trajectonomics.com/",
		]) {
			expect(locationOf(new Request(host))).toBeUndefined()
		}
	})

	test("leaves a method other than GET or HEAD to the assets", () => {
		expect(oldHostRedirect(oldHost("/", "POST"))).toBeUndefined()
	})
})
