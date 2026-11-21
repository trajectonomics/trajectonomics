import { describe, expect, it } from "bun:test"
import type { HtmlElement } from "./html"
import { minimumContrast } from "./minimum-contrast"
import { typeScaleOf } from "./type-scale"

const CSS = `:root{--text-sm:0.875rem;--text-hero:1.5rem;--text-xl:1.25rem;--text-4xl:2.25rem;--font-weight-semibold:600;--font-weight-bold:700}
.text-4xl{font-size:var(--text-4xl)}.text-xl{font-size:var(--text-xl)}.text-hero{font-size:var(--text-hero)}.text-sm{font-size:var(--text-sm)}
.font-bold{font-weight:var(--font-weight-bold)}.font-semibold{font-weight:var(--font-weight-semibold)}`

const SCALE = typeScaleOf([{ path: "_astro/site.css", content: CSS }])

function element(tag: string, classNames: string): HtmlElement {
	return { tag, attributes: { class: classNames }, ancestors: [] }
}

/** The elements a text run sits inside, outermost first. */
function chain(...classNames: readonly string[]): readonly HtmlElement[] {
	return classNames.map((name) => element("div", name))
}

describe("the contrast bar a text run is held to", () => {
	it("is 4.5:1 for body text, which WCAG calls normal", () => {
		expect(minimumContrast(chain(""), SCALE)).toBe(4.5)
	})

	it("is 3:1 for 36px text, which WCAG calls large", () => {
		expect(minimumContrast(chain("text-4xl"), SCALE)).toBe(3)
	})

	it("is 3:1 at exactly 24px, the first size WCAG calls large", () => {
		expect(minimumContrast(chain("text-hero"), SCALE)).toBe(3)
	})

	it("is 3:1 for 20px bold text, the other shape of large text", () => {
		expect(minimumContrast(chain("text-xl font-bold"), SCALE)).toBe(3)
	})

	it("is 4.5:1 for 20px regular text, which is under the large-text size", () => {
		expect(minimumContrast(chain("text-xl"), SCALE)).toBe(4.5)
	})

	it("is 4.5:1 for 20px semibold text, which is under the bold weight", () => {
		expect(minimumContrast(chain("text-xl font-semibold"), SCALE)).toBe(4.5)
	})
})

describe("the type the ancestors above a text run set", () => {
	it("is the nearest element's, so an inner small utility restores 4.5:1", () => {
		expect(minimumContrast(chain("text-4xl", "text-sm"), SCALE)).toBe(4.5)
	})

	it("is the outer size and the inner weight, so each ancestor can set one half", () => {
		expect(minimumContrast(chain("text-xl", "font-bold"), SCALE)).toBe(3)
	})

	it("ignores a text utility that names a colour and not a size", () => {
		expect(minimumContrast(chain("text-foreground"), SCALE)).toBe(4.5)
	})
})
