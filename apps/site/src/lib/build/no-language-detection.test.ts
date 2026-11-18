import { describe, expect, it } from "bun:test"
import { checkNoLanguageDetection } from "./no-language-detection"
import { codes, edited, entryAt } from "./testing/homes"

describe("the Language a Locale URL chooses", () => {
	it("passes a home that reads no browser signal at all", () => {
		expect(codes(checkNoLanguageDetection)).toEqual([])
	})

	it("fails a home whose script reads the browser's Language", () => {
		const script = "<script>if (navigator.language.startsWith('th')) go()</script>"
		const page = edited(entryAt(0).language, /<\/body>/, `${script}</body>`)
		expect(codes(checkNoLanguageDetection, page)).toEqual(["SCRIPT_DETECTS_LANGUAGE"])
	})

	it("passes a home whose data block mentions the browser's own Language", () => {
		const block =
			'<script type="application/ld+json">{"@context":"https://schema.org","@graph":[{"value":"navigator.language"}]}</script>'
		const page = edited(entryAt(0).language, /<\/head>/, `${block}</head>`)
		expect(codes(checkNoLanguageDetection, page)).toEqual([])
	})

	it("fails a home whose script reads a stored preference", () => {
		const script = "<script>const saved = localStorage.getItem('language')</script>"
		const page = edited(entryAt(0).language, /<\/body>/, `${script}</body>`)
		expect(codes(checkNoLanguageDetection, page)).toEqual(["SCRIPT_DETECTS_LANGUAGE"])
	})
})
