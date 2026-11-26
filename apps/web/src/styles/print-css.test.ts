import { describe, expect, test } from "bun:test"
import { readFileSync } from "node:fs"
import { join } from "node:path"

/** The text between the braces that open at `from`, and the index after the closing brace. */
function block(css: string, from: number): { body: string; end: number } {
	let depth = 0
	for (let at = from; at < css.length; at++) {
		if (css[at] === "{") depth++
		if (css[at] === "}" && --depth === 0)
			return { body: css.slice(css.indexOf("{", from) + 1, at), end: at + 1 }
	}
	throw new Error("unbalanced braces in global.css")
}

/** The declarations of each rule directly inside a block, by its selectors (comments removed). */
function rules(body: string): Map<string, Record<string, string>> {
	const found = new Map<string, Record<string, string>>()
	const text = body.replace(/\/\*[\s\S]*?\*\//g, "")
	for (let at = 0; ; ) {
		const open = text.indexOf("{", at)
		if (open === -1) return found
		const { body: inner, end } = block(text, open)
		const selector = text.slice(at, open).trim().replace(/\s+/g, " ")
		const declarations: Record<string, string> = {}
		for (const line of inner.split(";")) {
			const colon = line.indexOf(":")
			if (colon > 0) declarations[line.slice(0, colon).trim()] = line.slice(colon + 1).trim()
		}
		found.set(selector, declarations)
		at = end
	}
}

const CSS = readFileSync(join(import.meta.dir, "global.css"), "utf8")
const start = CSS.indexOf("@media print")
const print = rules(block(CSS, start).body)
const rule = (selector: string): Record<string, string> => print.get(selector) ?? {}

describe("the print stylesheet", () => {
	test("holds a @media print block", () => {
		expect(start).toBeGreaterThan(0)
		expect(print.size).toBeGreaterThan(5)
	})

	test("fits a table to the page: no minimum width, the page's width, and a header that may break", () => {
		expect(rule("table")).toMatchObject({ width: "100%", "min-width": "0", "table-layout": "auto" })
		expect(rule("table")["font-size"]).toBe("8pt")
		expect(rule("th")["overflow-wrap"]).toBe("anywhere")
	})

	test("never splits a figure or a date over two lines", () => {
		expect(rule("td")["overflow-wrap"]).toBe("normal")
		const whole = rule("td.tabular-nums, td .tabular-nums, [data-report] td")
		expect(whole["white-space"]).toBe("nowrap")
		for (const [selector, declarations] of print) {
			if (!/\btd\b/.test(selector)) continue
			expect(declarations["white-space"]).not.toBe("normal")
			expect(declarations["overflow-wrap"]).not.toBe("anywhere")
		}
		expect(print.has('[class*="whitespace-nowrap"]')).toBe(false)
	})

	test("keeps a figure cell and every cell of a Report on one line", () => {
		const selectors = [...print.entries()]
			.filter(([, declarations]) => declarations["white-space"] === "nowrap")
			.map(([selector]) => selector)
			.join(" | ")
		expect(selectors).toContain("td.tabular-nums")
		expect(selectors).toContain("td .tabular-nums")
		expect(selectors).toContain("[data-report] td")
	})

	test("hides a picker, so its empty border does not print", () => {
		expect(rule("fieldset:has(input)")["display"]).toBe("none")
	})

	test("removes a table's scroll box and a chart's minimum width", () => {
		const scroll = [...print.keys()].find((selector) => selector.includes('[class*="max-h-"]'))
		expect(print.get(scroll ?? "")).toMatchObject({ "max-height": "none", overflow: "visible" })
		expect(rule('svg[class*="min-w-"]')["min-width"]).toBe("0")
	})

	test("wraps preformatted text, such as the argv a figure came from, instead of running off the page", () => {
		expect(rule("pre")["white-space"]).toBe("pre-wrap")
	})

	test("shows a closed provenance Details' contents on paper, and only that disclosure's", () => {
		expect(rule("details[data-provenance]::details-content")["content-visibility"]).toBe("visible")
		expect([...print.keys()].filter((selector) => selector.startsWith("details"))).toEqual([
			"details[data-provenance]::details-content",
		])
	})

	test("repeats a table's header, keeps it from sticking, and does not split a row", () => {
		expect(rule("thead")).toMatchObject({ display: "table-header-group", position: "static" })
		expect(rule("tr")["break-inside"]).toBe("avoid")
	})

	test("resets the Theme to black on white for both themes, so a dark screen prints light", () => {
		const theme = rule(':root, [data-theme="light"], [data-theme="dark"]')
		expect(theme["color-scheme"]).toBe("light")
		for (const [token, value] of Object.entries({
			background: "#fff",
			foreground: "#000",
			card: "#fff",
			"card-foreground": "#000",
			muted: "#fff",
			"muted-foreground": "#000",
		})) {
			expect(theme[`--ds-color-${token}`]).toBe(value)
		}
		expect(rule("html, body")).toMatchObject({ background: "#fff", color: "#000" })
		expect(theme["--ds-color-primary"]).toBe("#000")
		expect(theme["--ds-color-primary-foreground"]).toBe("#fff")
	})

	test("hides select, input and button controls, but not a button inside a table cell", () => {
		const hidden = [...print.entries()].find(
			([selector, declarations]) =>
				declarations["display"] === "none" && selector.includes("select"),
		)
		expect(hidden?.[0]).toContain("select")
		expect(hidden?.[0]).toContain("input")
		expect(hidden?.[0]).toContain("button:not(td button, th button)")
	})
})
