import { describe, expect, it } from "bun:test"
import { checkLandmarks } from "./landmarks"
import { testFiles } from "./test-page"

function codes(index?: string): readonly string[] {
	return checkLandmarks(testFiles(index === undefined ? {} : { index })).map(
		(failure) => failure.code,
	)
}

function page(body: string, head = ""): string {
	return `<html lang="en" data-theme="light"><head>${head}</head><body>${body}</body></html>`
}

describe("the landmarks of a built page", () => {
	it("passes a page with a header, a hero in main and a footer", () => {
		expect(codes()).toEqual([])
	})

	it("fails a page with no header", () => {
		expect(codes(page("<main><h1>Hero</h1></main><footer></footer>"))).toEqual(["HEADER_MISSING"])
	})

	it("fails a page with no footer", () => {
		expect(codes(page("<header></header><main><h1>Hero</h1></main>"))).toEqual(["FOOTER_MISSING"])
	})

	it("fails a page with no h1 for the hero", () => {
		expect(codes(page("<header></header><main><p>Hero</p></main><footer></footer>"))).toEqual([
			"HERO_MISSING",
		])
	})

	it("fails a page whose only h1 is outside main, because the hero is main's", () => {
		expect(
			codes(page("<header><h1>Trajectonomics</h1></header><main></main><footer></footer>")),
		).toEqual(["HERO_MISSING"])
	})

	it("fails a page with a second heading, because the hero makes the page's one claim", () => {
		expect(
			codes(page("<header></header><main><h1>Hero</h1><h2>More</h2></main><footer></footer>")),
		).toEqual(["EXTRA_HEADING"])
	})

	it("fails a page with two h1 elements in main", () => {
		expect(
			codes(page("<header></header><main><h1>a</h1><h1>b</h1></main><footer></footer>")),
		).toEqual(["HERO_MISSING"])
	})

	it("judges the Not-found page as well, not only the index page", () => {
		const files = [
			{
				path: "index.html",
				content: page("<header></header><main><h1>a</h1></main><footer></footer>"),
			},
			{ path: "404.html", content: page("<header></header><main><h1>a</h1></main>") },
		]
		expect(checkLandmarks(files).map((failure) => [failure.code, failure.path])).toEqual([
			["FOOTER_MISSING", "404.html"],
		])
	})
})
