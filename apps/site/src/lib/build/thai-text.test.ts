import { describe, expect, it } from "bun:test"
import type { BuiltFile } from "./built-files"
import { page } from "./testing/weight"
import { checkThaiTextLanguage } from "./thai-text"

function codes(files: readonly BuiltFile[]): readonly string[] {
	return checkThaiTextLanguage(files).map((failure) => failure.code)
}

describe("the Language Thai text inherits", () => {
	it("passes a Thai page whose document declares Thai", () => {
		expect(codes([page("th/index.html", "", "<p>สวัสดี</p>", "th")])).toEqual([])
	})

	it("passes a Thai word marked Thai on an English page", () => {
		const body = '<a href="/th/" lang="th" hreflang="th">ไทย</a>'
		expect(codes([page("index.html", "", body)])).toEqual([])
	})

	it("treats a Thai variant such as th-TH as Thai", () => {
		expect(codes([page("th/index.html", "", "<p>สวัสดี</p>", "th")])).toEqual([])
		expect(codes([page("th/index.html", "", '<p lang="th-TH">สวัสดี</p>', "th")])).toEqual([])
	})

	it("fails Thai text on a page that declares another Language", () => {
		expect(codes([page("index.html", "", "<p>สวัสดี</p>")])).toEqual(["THAI_TEXT_LANGUAGE_WRONG"])
	})

	it("fails Thai text whose nearest declared Language is not Thai", () => {
		const body = '<p lang="en">สวัสดี</p>'
		expect(codes([page("th/index.html", "", body, "th")])).toEqual(["THAI_TEXT_LANGUAGE_WRONG"])
	})

	it("fails Thai text in an element with no Language of its own under an English page", () => {
		const body = "<div><span>สวัสดี</span></div>"
		expect(codes([page("index.html", "", body)])).toEqual(["THAI_TEXT_LANGUAGE_WRONG"])
	})

	it("judges a Thai title against the Language it inherits", () => {
		const thai = page("th/404.html", "<title>ไม่พบหน้านี้</title>", "", "th")
		const english = page("404.html", "<title>ไม่พบหน้านี้</title>", "", "en")
		expect(codes([thai])).toEqual([])
		expect(codes([english])).toEqual(["THAI_TEXT_LANGUAGE_WRONG"])
	})

	it("lets a title declare Thai itself on an English page", () => {
		const title = '<title lang="th">ไม่พบหน้านี้</title>'
		expect(codes([page("404.html", title, "", "en")])).toEqual([])
	})

	it("judges the Not-found pages like any other page", () => {
		expect(codes([page("404.html", "", "<p>สวัสดี</p>")])).toEqual(["THAI_TEXT_LANGUAGE_WRONG"])
	})
})
