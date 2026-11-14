import { describe, expect, it } from "bun:test"
import { contrastRatio, parseRgb, relativeLuminance, sameColour } from "./colour"

describe("a colour value", () => {
	it("reads a short and a long hexadecimal value as the same colour", () => {
		expect(parseRgb("#fff")).toEqual({ red: 255, green: 255, blue: 255 })
		expect(parseRgb("#FFFFFF")).toEqual({ red: 255, green: 255, blue: 255 })
	})

	it("reads the three channels of a long hexadecimal value", () => {
		expect(parseRgb("#0a0a0a")).toEqual({ red: 10, green: 10, blue: 10 })
	})

	it("has no colour for a value that is not hexadecimal", () => {
		expect(parseRgb("oklch(0.5 0.1 200)")).toBeUndefined()
		expect(parseRgb("transparent")).toBeUndefined()
	})
})

describe("the relative luminance of a colour", () => {
	it("is 0 for black and 1 for white, the ends of the scale", () => {
		expect(relativeLuminance({ red: 0, green: 0, blue: 0 })).toBe(0)
		expect(relativeLuminance({ red: 255, green: 255, blue: 255 })).toBe(1)
	})

	it("weights green above red above blue", () => {
		const red = relativeLuminance({ red: 255, green: 0, blue: 0 })
		const green = relativeLuminance({ red: 0, green: 255, blue: 0 })
		const blue = relativeLuminance({ red: 0, green: 0, blue: 255 })

		expect(green).toBeGreaterThan(red)
		expect(red).toBeGreaterThan(blue)
	})
})

describe("the contrast ratio of two colours", () => {
	it("is 21 for black on white, the highest WCAG allows", () => {
		expect(
			contrastRatio({ red: 0, green: 0, blue: 0 }, { red: 255, green: 255, blue: 255 }),
		).toBeCloseTo(21, 10)
	})

	it("is 1 for a colour on itself", () => {
		const grey = { red: 115, green: 115, blue: 115 }
		expect(contrastRatio(grey, grey)).toBe(1)
	})

	it("does not depend on which colour is written first", () => {
		const white = { red: 255, green: 255, blue: 255 }
		const grey = { red: 118, green: 118, blue: 118 }
		expect(contrastRatio(white, grey)).toBe(contrastRatio(grey, white))
	})

	it("puts the lightest AA grey on white at 4.54:1, the published worked example", () => {
		expect(
			contrastRatio({ red: 118, green: 118, blue: 118 }, { red: 255, green: 255, blue: 255 }),
		).toBeCloseTo(4.54, 2)
	})

	it("fails the muted foreground on a muted background, the pair the Site must not use", () => {
		const muted = { red: 245, green: 245, blue: 245 }
		const mutedForeground = { red: 115, green: 115, blue: 115 }
		expect(contrastRatio(mutedForeground, muted)).toBeLessThan(4.5)
	})
})

describe("two written colours", () => {
	it("are the same when the CSS wrote one short and one long", () => {
		expect(sameColour("#ffffff", "#fff")).toBe(true)
		expect(sameColour("#FFF", "#ffffff")).toBe(true)
	})

	it("are not the same when their channels differ", () => {
		expect(sameColour("#ffffff", "#fafafa")).toBe(false)
	})

	it("are not the same when one is not a colour this check can resolve", () => {
		expect(sameColour("#ffffff", "transparent")).toBe(false)
	})
})
