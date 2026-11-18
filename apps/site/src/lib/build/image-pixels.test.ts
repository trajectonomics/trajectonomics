import { describe, expect, it } from "bun:test"
import { pngPixels } from "./image-pixels"

/** The twenty-four bytes a PNG opens with: the signature, the chunk length, `IHDR`, width and height. */
function header(width: number, height: number): Uint8Array {
	const bytes = new Uint8Array(24)
	bytes.set([137, 80, 78, 71, 13, 10, 26, 10])
	bytes.set([0, 0, 0, 13], 8)
	bytes.set([73, 72, 68, 82], 12)
	const view = new DataView(bytes.buffer)
	view.setUint32(16, width)
	view.setUint32(20, height)
	return bytes
}

describe("the size a PNG states in its header", () => {
	it("reads the width and the height of a card's image", () => {
		expect(pngPixels(header(1200, 630))).toEqual({ width: 1200, height: 630 })
	})

	it("reads nothing from bytes shorter than a PNG header", () => {
		expect(pngPixels(header(1200, 630).subarray(0, 23))).toBeUndefined()
	})

	it("reads nothing from a file that does not open like a PNG", () => {
		const jpeg = header(1200, 630)
		jpeg.set([255, 216, 255, 224], 0)
		expect(pngPixels(jpeg)).toBeUndefined()
	})

	it("reads nothing from a PNG whose first chunk is not IHDR", () => {
		const text = header(1200, 630)
		text.set([116, 69, 88, 116], 12)
		expect(pngPixels(text)).toBeUndefined()
	})

	it("reads nothing from an image that states no width", () => {
		expect(pngPixels(header(0, 630))).toBeUndefined()
	})
})
