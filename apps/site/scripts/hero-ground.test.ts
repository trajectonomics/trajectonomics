import { describe, expect, it } from "bun:test"
import { pixelBlastField } from "../src/lib/design/pixel-blast"
import { CELL_PIXELS, oneBitPng, pngChunk, TILE_PIXELS } from "./hero-ground"

/** One chunk of a PNG: its type and its data. */
interface Chunk {
	readonly type: string
	readonly data: Uint8Array
}

/** The chunks one PNG carries, in order, read back out of the bytes. */
function chunksOf(png: Uint8Array): readonly Chunk[] {
	const chunks: Chunk[] = []
	let offset = 8
	while (offset < png.length) {
		const length = new DataView(png.buffer, png.byteOffset + offset).getUint32(0)
		const type = String.fromCharCode(...png.subarray(offset + 4, offset + 8))
		chunks.push({ type, data: png.subarray(offset + 8, offset + 8 + length) })
		offset += 12 + length
	}
	return chunks
}

/** One big-endian 32-bit word at `offset` of a chunk's data. */
function word(data: Uint8Array, offset: number): number {
	return new DataView(data.buffer, data.byteOffset + offset).getUint32(0)
}

const field = pixelBlastField({ width: 32, height: 32, ink: 0.3, seed: 7 })
const png = oneBitPng(field, 2)

describe("the hero's one-bit PNG", () => {
	it("starts with the PNG signature and ends with IEND", () => {
		expect([...png.subarray(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10])
		expect(chunksOf(png).at(-1)?.type).toBe("IEND")
	})

	it("writes a one-bit palette image the size of the cell grid", () => {
		const header = chunksOf(png)[0]
		if (header === undefined) throw new Error("the PNG carries no header")
		expect(header.type).toBe("IHDR")
		expect(word(header.data, 0)).toBe(32 * 2)
		expect(word(header.data, 4)).toBe(32 * 2)
		expect(header.data[8]).toBe(1)
		expect(header.data[9]).toBe(3)
	})

	it("carries a transparent palette entry before the white one", () => {
		const [, palette, alpha] = chunksOf(png)
		expect(palette?.type).toBe("PLTE")
		expect(alpha?.type).toBe("tRNS")
		expect([...(alpha?.data ?? [])]).toEqual([0, 255])
	})

	it("checksums every chunk, so a corrupted byte would not load", () => {
		const chunk = pngChunk("IHDR", new Uint8Array([1, 2, 3]))
		expect(new DataView(chunk.buffer).getUint32(0)).toBe(3)
		expect(new DataView(chunk.buffer).getUint32(chunk.length - 4)).not.toBe(0)
	})

	it("prints the same bytes twice, so a rebuild does not touch the file", () => {
		expect(oneBitPng(field, 2)).toEqual(oneBitPng(field, 2))
	})

	it("deflates the shipped tile to a few kilobytes, not half a megabyte", () => {
		const cells = TILE_PIXELS / CELL_PIXELS
		const tile = pixelBlastField({ width: cells, height: cells, ink: 0.3, seed: 7 })
		expect(tile.cells.length).toBe(cells * cells)
		expect(oneBitPng(tile, CELL_PIXELS).length).toBeLessThan(24_000)
	})
})
