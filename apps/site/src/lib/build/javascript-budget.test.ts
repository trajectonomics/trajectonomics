import { describe, expect, it } from "bun:test"
import type { BuiltFile } from "./built-files"
import { checkPageWeight } from "./page-weight"
import { asset, incompressible, page } from "./testing/weight"

function codes(files: readonly BuiltFile[]): readonly string[] {
	return checkPageWeight(files).map((failure) => failure.code)
}

describe("the program JavaScript budget", () => {
	it("passes a page with no script at all", () => {
		expect(codes([page("en/index.html")])).toEqual([])
	})

	it("counts inline script text uncompressed and fails at 5,000 bytes", () => {
		const under = page("en/index.html", "", `<script>${"x".repeat(4_999)}</script>`)
		const reaching = page("en/index.html", "", `<script>${"x".repeat(5_000)}</script>`)
		expect(codes([under])).toEqual([])
		expect(codes([reaching])).toEqual(["PAGE_JAVASCRIPT_OVER_BUDGET"])
	})

	it("counts a same-origin script file and its static import graph", () => {
		const files = [
			page("en/index.html", '<script src="/_astro/main.js" type="module"></script>'),
			asset("_astro/main.js", `import "./a.js"\n${"x".repeat(1_000)}`),
			asset("_astro/a.js", incompressible(6_000)),
		]
		expect(codes(files)).toEqual(["PAGE_JAVASCRIPT_OVER_BUDGET"])
	})

	it("counts each imported file once, however many statements import it", () => {
		const twice = `import "./a.js";\nimport "./a.js";\nexport * from "./a.js"\n${"x".repeat(900)}`
		const files = [
			page("en/index.html", '<script src="/_astro/main.js" type="module"></script>'),
			asset("_astro/main.js", twice),
			asset("_astro/a.js", incompressible(3_000)),
		]
		expect(codes(files)).toEqual([])
	})

	it("follows an import relative to the script that writes it", () => {
		const files = [
			page("en/index.html", '<script src="/_astro/main.js" type="module"></script>'),
			asset("_astro/main.js", 'import "./deep/a.js"'),
			asset("_astro/deep/a.js", incompressible(6_000)),
		]
		expect(codes(files)).toEqual(["PAGE_JAVASCRIPT_OVER_BUDGET"])
	})

	it("follows the static imports of an inline module script", () => {
		const files = [
			page("en/index.html", "", '<script type="module">import "/_astro/a.js"</script>'),
			asset("_astro/a.js", incompressible(6_000)),
		]
		expect(codes(files)).toEqual(["PAGE_JAVASCRIPT_OVER_BUDGET"])
	})

	it("counts a same-origin script preload", () => {
		const files = [
			page("en/index.html", '<link rel="preload" as="script" href="/_astro/a.js">'),
			asset("_astro/a.js", incompressible(6_000)),
		]
		expect(codes(files)).toEqual(["PAGE_JAVASCRIPT_OVER_BUDGET"])
	})

	it("counts a module preload", () => {
		const files = [
			page("en/index.html", '<link rel="modulepreload" href="/_astro/a.js">'),
			asset("_astro/a.js", incompressible(6_000)),
		]
		expect(codes(files)).toEqual(["PAGE_JAVASCRIPT_OVER_BUDGET"])
	})

	it("leaves JSON-LD data out of the figure", () => {
		const data = `<script type="application/ld+json">{"x":"${"y".repeat(6_000)}"}</script>`
		expect(codes([page("en/index.html", data)])).toEqual([])
	})

	it("fails a page whose script file the build did not produce", () => {
		const files = [
			page("en/index.html", '<script src="/_astro/missing.js" type="module"></script>'),
		]
		const failures = checkPageWeight(files)
		expect(failures.map((failure) => failure.code)).toEqual(["SCRIPT_MISSING"])
		expect(failures[0]?.path).toBe("_astro/missing.js")
	})

	it("counts an inline program script toward the HTML bytes as well", () => {
		const files = [page("en/index.html", "", `<script>${incompressible(90_000)}</script>`)]
		expect(codes(files)).toEqual(["PAGE_WEIGHT_OVER_BUDGET", "PAGE_JAVASCRIPT_OVER_BUDGET"])
	})
})
