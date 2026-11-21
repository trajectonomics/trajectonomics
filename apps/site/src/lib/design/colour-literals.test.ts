import { describe, expect, it } from "bun:test"
import { TEST_TAILWIND_CSS } from "../build/test-page"
import { findColourLiterals } from "./colour-literals"
import { parseDesignTokens } from "./tokens"

const ROLES = parseDesignTokens({ themes: [], tailwind: TEST_TAILWIND_CSS }).colourUtilities

function codes(path: string, content: string): readonly string[] {
	return findColourLiterals([{ path, content }], ROLES).map((literal) => literal.code)
}

function values(path: string, content: string): readonly string[] {
	return findColourLiterals([{ path, content }], ROLES).map((literal) => literal.value)
}

const CSS = "src/styles/global.css"
const ASTRO = "src/layouts/Layout.astro"

describe("a colour written as a value", () => {
	it("fails a hexadecimal colour in a stylesheet", () => {
		expect(codes(CSS, "a { color: #fff; }")).toEqual(["COLOUR_LITERAL"])
		expect(values(CSS, "a { color: #fff; }")).toEqual(["#fff"])
	})

	it("fails a colour function in a stylesheet", () => {
		expect(codes(CSS, "a { color: oklch(0.5 0.1 200); }")).toEqual(["COLOUR_LITERAL"])
		expect(codes(CSS, "a { background: rgb(0 0 0 / 50%); }")).toEqual(["COLOUR_LITERAL"])
	})

	it("fails a named CSS colour", () => {
		expect(codes(CSS, "a { border-color: tomato; }")).toEqual(["COLOUR_LITERAL"])
	})

	it("fails a colour inside a nested at-rule, not only a top-level rule", () => {
		expect(codes(CSS, "@media (min-width: 40rem) { a { color: #123456; } }")).toEqual([
			"COLOUR_LITERAL",
		])
	})

	it("passes a Semantic Token Role", () => {
		expect(codes(CSS, "a { color: var(--ds-color-foreground); }")).toEqual([])
	})

	it("passes the keywords the Contract allows", () => {
		expect(
			codes(CSS, "a { color: currentColor; fill: currentColor; border-color: transparent; }"),
		).toEqual([])
		expect(codes(CSS, "a { color: inherit; border-style: none; }")).toEqual([])
	})

	it("fails a value that names a role and a literal together", () => {
		expect(codes(CSS, "a { color: var(--ds-color-foreground), tomato; }")).toEqual([
			"COLOUR_LITERAL",
		])
	})

	it("does not read a colour out of a comment", () => {
		expect(codes(CSS, "/* was color: #fff; */ a { color: var(--ds-color-foreground); }")).toEqual(
			[],
		)
	})
})

describe("a colour written as a utility class", () => {
	it("passes the role utilities the published stylesheet generates", () => {
		expect(codes(ASTRO, '<p class="bg-background text-muted-foreground"></p>')).toEqual([])
	})

	it("passes a role utility with a variant, which is still a role", () => {
		expect(codes(ASTRO, '<a class="hover:bg-card focus-visible:text-foreground"></a>')).toEqual([])
	})

	it("passes a utility that is not a colour at all", () => {
		expect(codes(ASTRO, '<p class="text-sm font-black border-2"></p>')).toEqual([])
	})

	it("fails an arbitrary colour utility, naming the colour rather than the class", () => {
		expect(codes(ASTRO, '<p class="bg-[#ffffff]"></p>')).toEqual(["COLOUR_LITERAL"])
		expect(values(ASTRO, '<p class="bg-[#ffffff]"></p>')).toEqual(["#ffffff"])
	})

	it("fails a default-palette utility", () => {
		expect(codes(ASTRO, '<p class="text-gray-500"></p>')).toEqual(["DEFAULT_PALETTE_UTILITY"])
		expect(codes(ASTRO, '<p class="bg-white"></p>')).toEqual(["DEFAULT_PALETTE_UTILITY"])
		expect(codes(ASTRO, '<p class="ring-offset-black"></p>')).toEqual(["DEFAULT_PALETTE_UTILITY"])
	})

	it("fails a dark variant, which follows the device scheme rather than data-theme", () => {
		expect(codes(ASTRO, '<p class="dark:bg-card"></p>')).toEqual(["DARK_VARIANT"])
	})

	it("passes a class that is not a colour utility at all", () => {
		expect(codes(ASTRO, '<div class="mx-auto max-w-5xl grid-cols-[1fr_2fr]"></div>')).toEqual([])
	})
})

describe("a colour written on an SVG", () => {
	it("passes the currentColor fill the wordmark ships", () => {
		expect(codes("src/logo.svg", '<path fill="currentColor" d="M0 0"></path>')).toEqual([])
	})

	it("fails a hexadecimal fill and a hexadecimal stroke", () => {
		expect(codes("src/logo.svg", '<path fill="#000" stroke="#ffffff"></path>')).toEqual([
			"COLOUR_LITERAL",
			"COLOUR_LITERAL",
		])
	})

	it("fails a colour in an inline style attribute", () => {
		expect(codes(ASTRO, '<p style="color: red"></p>')).toEqual(["COLOUR_LITERAL"])
	})

	it("fails a colour in a style block", () => {
		expect(codes(ASTRO, "<style>p { color: #000; }</style>")).toEqual(["COLOUR_LITERAL"])
	})

	it("reads a class attribute with single quotes", () => {
		expect(codes(ASTRO, "<p class='bg-white'></p>")).toEqual(["DEFAULT_PALETTE_UTILITY"])
	})
})

describe("a source the rule does not judge", () => {
	it("is a TypeScript file, which is not a styling source", () => {
		expect(codes("src/lib/palette.ts", 'export const ink = "#000"')).toEqual([])
	})

	it("is a copied Brand Asset, whose bytes keep the colours the package shipped", () => {
		expect(codes("public/favicon/favicon.ico", "\u0000#fff")).toEqual([])
	})
})
