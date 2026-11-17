import { describe, expect, it } from "bun:test"
import { pixelBlastField } from "./pixel-blast"

/** The share of a field that is ink. */
function inkShare(cells: readonly boolean[]): number {
	return cells.filter(Boolean).length / cells.length
}

describe("the pixel blast field", () => {
	it("inks the share of cells it is asked for", () => {
		const field = pixelBlastField({ width: 128, height: 128, ink: 0.34, seed: 7 })
		expect(inkShare(field.cells)).toBeCloseTo(0.34, 1)
	})

	it("holds one cell per position, in reading order", () => {
		const field = pixelBlastField({ width: 32, height: 16, ink: 0.5, seed: 1 })
		expect(field.width).toBe(32)
		expect(field.height).toBe(16)
		expect(field.cells.length).toBe(32 * 16)
	})

	it("prints the same field twice from the same seed, and another from another", () => {
		const options = { width: 64, height: 64, ink: 0.4, seed: 3 }
		expect(pixelBlastField(options).cells).toEqual(pixelBlastField(options).cells)
		expect(pixelBlastField({ ...options, seed: 4 }).cells).not.toEqual(
			pixelBlastField(options).cells,
		)
	})

	it("inks more cells as it is asked for more ink", () => {
		const shares = [0.2, 0.4, 0.6].map((ink) =>
			inkShare(pixelBlastField({ width: 64, height: 64, ink, seed: 9 }).cells),
		)
		expect(shares[0]).toBeLessThan(shares[1] ?? 0)
		expect(shares[1]).toBeLessThan(shares[2] ?? 0)
	})
})
