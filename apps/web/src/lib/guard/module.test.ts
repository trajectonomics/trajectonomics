import { describe, expect, test } from "bun:test"
import { checkModule } from "./module"

const rulesOf = (source: string, file: string) =>
	checkModule(source, file).map((issue) => issue.rule)

describe("the guard over a plain module", () => {
	test("refuses a store, React and Astro wherever the module is", () => {
		expect(rulesOf('import { writable } from "svelte/store"', "src/lib/view/x.ts")).toEqual([
			"legacy/svelte-store",
		])
		expect(rulesOf('const store = await import("svelte/store")', "src/lib/view/x.ts")).toEqual([
			"legacy/svelte-store",
		])
		expect(rulesOf('import React from "react"', "src/lib/view/x.ts")).toEqual([
			"framework/react-or-astro",
		])
		expect(rulesOf('import type { APIRoute } from "astro"', "src/lib/view/x.ts")).toEqual([
			"framework/react-or-astro",
		])
	})

	test("refuses the browser outside src/client, by any of its names", () => {
		const file = "src/components/chart/helper.ts"
		expect(rulesOf("const response = await fetch (url)", file)).toEqual(["browser/fetch"])
		expect(rulesOf('sessionStorage.setItem("a", "b")', file)).toEqual(["browser/local-storage"])
		expect(rulesOf("const width = globalThis.innerWidth", file)).toEqual(["browser/window"])
		expect(rulesOf("document?.title", file)).toEqual(["browser/document"])
		expect(rulesOf("window.location.search", "src/client/browser.ts")).toEqual([])
	})

	test("refuses a money string becoming a number beside a component, not in the pure library", () => {
		expect(rulesOf("const n = Number (amount)", "src/components/chart/helper.ts")).toEqual([
			"money/number-conversion",
		])
		expect(rulesOf("const year = Number(match[1])", "src/lib/format/date.ts")).toEqual([])
	})

	test("reads a comment as prose, and ordinary TypeScript as ordinary", () => {
		const source =
			"/** The Snapshot document. Stored in localStorage by the client. */\nexport let count = 0"
		expect(rulesOf(source, "src/lib/view/x.ts")).toEqual([])
	})
})
