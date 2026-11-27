import { describe, expect, test } from "bun:test"
import { buildCoverHtml, parseCoverArgs } from "./cover-template"

const COLORS = Object.freeze({
	background: "#0a0a0a",
	foreground: "#fafafa",
	accent: "#ea580c",
})

describe("cover CLI argument parsing", () => {
	test("parses required flags, newline escapes and numeric defaults", () => {
		const parsed = parseCoverArgs([
			"--in",
			"raw.webp",
			"--out",
			"cover.webp",
			"--title",
			"Line one\\nLine two",
			"--kicker",
			"Poteto Pyramid",
		])
		expect(parsed).toEqual({
			input: "raw.webp",
			output: "cover.webp",
			title: "Line one\nLine two",
			kicker: "Poteto Pyramid",
			shiftY: 0,
			titleSizePx: 78,
		})
	})

	test("refuses calls missing required flags", () => {
		expect(() => parseCoverArgs(["--in", "raw.webp"])).toThrow("Usage:")
	})

	test("refuses unknown flags and stray positional arguments", () => {
		expect(() => parseCoverArgs(["--shfit", "10"])).toThrow("Unknown flag: --shfit")
		expect(() => parseCoverArgs(["raw.webp"])).toThrow("Unexpected argument: raw.webp")
	})

	test("refuses flags with missing values", () => {
		expect(() => parseCoverArgs(["--in", "raw.webp", "--out"])).toThrow("Missing value for --out")
	})

	test("refuses titles with more than two lines", () => {
		expect(() =>
			parseCoverArgs(["--in", "a", "--out", "b", "--title", "One\\nTwo\\nThree"]),
		).toThrow("at most 2 lines")
	})

	test("refuses invalid numeric options naming the flag", () => {
		expect(() =>
			parseCoverArgs(["--in", "a", "--out", "b", "--title", "T", "--size", "0"]),
		).toThrow("--size")
		expect(() =>
			parseCoverArgs(["--in", "a", "--out", "b", "--title", "T", "--shift", "abc"]),
		).toThrow("--shift")
		expect(() =>
			parseCoverArgs(["--in", "a", "--out", "b", "--title", "T", "--shift", ""]),
		).toThrow("--shift")
	})
})

describe("cover HTML template", () => {
	test("escapes HTML in title and kicker and splits newlines into line breaks", () => {
		const html = buildCoverHtml({
			imageDataUri: "data:image/webp;base64,AA==",
			markSvg: "<svg></svg>",
			fontsCss: "",
			title: "Review <Proof>,\nNot & Code",
			kicker: "Poteto > Pyramid",
			colors: COLORS,
		})
		expect(html).toContain("<h1>Review &lt;Proof&gt;,<br />Not &amp; Code</h1>")
		expect(html).toContain('<p class="kicker">Poteto &gt; Pyramid</p>')
	})

	test("uses Azeret Mono 500 for Latin kickers and Inter + Noto Sans Thai 600 for Thai kickers", () => {
		const latin = buildCoverHtml({
			imageDataUri: "data:image/webp;base64,AA==",
			markSvg: "<svg></svg>",
			fontsCss: "",
			title: "Review Proof",
			kicker: "POTETO PYRAMID",
			colors: COLORS,
		})
		const thai = buildCoverHtml({
			imageDataUri: "data:image/webp;base64,AA==",
			markSvg: "<svg></svg>",
			fontsCss: "",
			title: "งบ 1,000 บาท",
			kicker: "3 งานที่ผมเลือก",
			colors: COLORS,
		})
		expect(latin).toContain(
			'font-family: "Azeret Mono", monospace; font-size: 40px; font-weight: 500',
		)
		expect(thai).toContain(
			'font-family: "Inter", "Noto Sans Thai", sans-serif; font-size: 40px; font-weight: 600',
		)
	})

	test("omits the kicker element when none is supplied", () => {
		const html = buildCoverHtml({
			imageDataUri: "data:image/webp;base64,AA==",
			markSvg: "<svg></svg>",
			fontsCss: "",
			title: "Plain title",
			colors: COLORS,
		})
		expect(html).not.toContain('<p class="kicker">')
	})

	test("applies a top fade mask using the Theme background when shifted", () => {
		const plain = buildCoverHtml({
			imageDataUri: "data:image/webp;base64,AA==",
			markSvg: "<svg></svg>",
			fontsCss: "",
			title: "Plain",
			colors: COLORS,
		})
		const shifted = buildCoverHtml({
			imageDataUri: "data:image/webp;base64,AA==",
			markSvg: "<svg></svg>",
			fontsCss: "",
			title: "Shifted",
			shiftY: 80,
			colors: COLORS,
		})
		expect(plain).not.toContain("mask-image:")
		expect(shifted).toContain("mask-image: linear-gradient(to bottom, transparent 0%, #0a0a0a 22%)")
		expect(shifted).toContain("translateY(80px)")
	})
})
