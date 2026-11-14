import { describe, expect, it } from "bun:test"
import type { BuiltFile } from "./built-files"
import {
	checkPageWeight,
	PAGE_WEIGHT_BUDGET_BYTES,
	PROGRAM_JAVASCRIPT_BUDGET_BYTES,
} from "./page-weight"
import { asset, incompressible, page } from "./testing/weight"

function codes(files: readonly BuiltFile[]): readonly string[] {
	return checkPageWeight(files).map((failure) => failure.code)
}

describe("the page weight budget", () => {
	it("is under 50,000 gzip bytes of HTML and stylesheets, and 10,000 uncompressed script bytes", () => {
		expect(PAGE_WEIGHT_BUDGET_BYTES).toBe(50_000)
		expect(PROGRAM_JAVASCRIPT_BUDGET_BYTES).toBe(10_000)
	})

	it("passes a page whose HTML and stylesheet stay under the budget", () => {
		const files = [
			page("en/index.html", '<link rel="stylesheet" href="/_astro/site.css">'),
			asset("_astro/site.css", "body{color:#000}"),
		]
		expect(codes(files)).toEqual([])
	})

	it("fails a page whose gzipped HTML alone reaches the budget", () => {
		const files = [page("en/index.html", "", incompressible(90_000))]
		expect(codes(files)).toEqual(["PAGE_WEIGHT_OVER_BUDGET"])
	})

	it("fails a page whose linked stylesheet pushes it over the budget", () => {
		const files = [
			page("en/index.html", '<link rel="stylesheet" href="/_astro/site.css">'),
			asset("_astro/site.css", incompressible(90_000)),
		]
		const failures = checkPageWeight(files)
		expect(failures.map((failure) => failure.code)).toEqual(["PAGE_WEIGHT_OVER_BUDGET"])
		expect(failures[0]?.path).toBe("/en/")
	})

	it("counts a stylesheet in full against every page that links it", () => {
		const share = incompressible(90_000)
		const files = [
			page("en/index.html", '<link rel="stylesheet" href="/_astro/site.css">'),
			page("th/index.html", '<link rel="stylesheet" href="/_astro/site.css">'),
			asset("_astro/site.css", share),
		]
		expect(codes(files)).toEqual(["PAGE_WEIGHT_OVER_BUDGET", "PAGE_WEIGHT_OVER_BUDGET"])
	})

	it("counts a stylesheet another stylesheet imports once, even when imported twice", () => {
		const files = [
			page("en/index.html", '<link rel="stylesheet" href="/_astro/a.css">'),
			asset("_astro/a.css", '@import "/_astro/b.css";@import "/_astro/b.css";'),
			asset("_astro/b.css", incompressible(40_000)),
		]
		expect(codes(files)).toEqual([])
	})

	it("follows a stylesheet import relative to the stylesheet, not the page", () => {
		const files = [
			page("en/index.html", '<link rel="stylesheet" href="/_astro/a.css">'),
			asset("_astro/a.css", '@import "./deep/b.css";'),
			asset("_astro/deep/b.css", incompressible(90_000)),
		]
		expect(codes(files)).toEqual(["PAGE_WEIGHT_OVER_BUDGET"])
	})

	it("follows an @import in an inline style, which a visitor downloads too", () => {
		const files = [
			page("en/index.html", '<style>@import "/_astro/big.css";</style>'),
			asset("_astro/big.css", incompressible(90_000)),
		]
		expect(codes(files)).toEqual(["PAGE_WEIGHT_OVER_BUDGET"])
	})

	it("fails a page that links a same-origin stylesheet the build did not produce", () => {
		const files = [page("en/index.html", '<link rel="stylesheet" href="/_astro/missing.css">')]
		const failures = checkPageWeight(files)
		expect(failures.map((failure) => failure.code)).toEqual(["STYLESHEET_MISSING"])
		expect(failures[0]?.path).toBe("_astro/missing.css")
	})

	it("measures the Not-found document like any other page", () => {
		const files = [page("404.html", "", incompressible(90_000))]
		const failures = checkPageWeight(files)
		expect(failures.map((failure) => failure.code)).toEqual(["PAGE_WEIGHT_OVER_BUDGET"])
		expect(failures[0]?.path).toBe("/404.html")
	})

	it("ignores a stylesheet from another origin, which another rule already fails", () => {
		const files = [
			page("en/index.html", '<link rel="stylesheet" href="https://cdn.example.com/site.css">'),
		]
		expect(codes(files)).toEqual([])
	})
})
