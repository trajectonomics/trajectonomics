import { describe, expect, it } from "bun:test"
import type { HtmlElement } from "./html"
import { paintedColours } from "./roles"

const ROLES = ["background", "foreground", "card", "card-foreground", "muted-foreground"]

function element(classNames: string): HtmlElement {
	return { tag: "div", attributes: { class: classNames }, ancestors: [] }
}

function chain(...classNames: readonly string[]): readonly HtmlElement[] {
	return classNames.map(element)
}

describe("the roles an element paints", () => {
	it("reads the role a background and a text utility name", () => {
		expect(paintedColours(chain("bg-background text-foreground"), ROLES)).toEqual({
			background: "background",
			foreground: "foreground",
		})
	})

	it("takes the nearest ancestor that paints, so a page can override the body", () => {
		expect(
			paintedColours(
				chain("bg-background text-foreground", "bg-card text-muted-foreground"),
				ROLES,
			),
		).toEqual({ background: "card", foreground: "muted-foreground" })
	})

	it("keeps the outer background when only the text colour is nearer", () => {
		expect(paintedColours(chain("bg-card text-foreground", "text-card-foreground"), ROLES)).toEqual(
			{
				background: "card",
				foreground: "card-foreground",
			},
		)
	})

	it("ignores a utility that is not a Semantic Token Role, such as a font size", () => {
		expect(paintedColours(chain("text-sm"), ROLES)).toEqual({
			background: undefined,
			foreground: undefined,
		})
	})

	it("ignores a role utility that only applies in a hover state", () => {
		expect(paintedColours(chain("hover:bg-card"), ROLES)).toEqual({
			background: undefined,
			foreground: undefined,
		})
	})

	it("has no role for an element with no class", () => {
		expect(paintedColours(chain(""), ROLES)).toEqual({
			background: undefined,
			foreground: undefined,
		})
		expect(paintedColours([], ROLES)).toEqual({ background: undefined, foreground: undefined })
	})
})
