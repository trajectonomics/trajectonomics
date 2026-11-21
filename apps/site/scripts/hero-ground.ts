import { mkdir, writeFile } from "node:fs/promises"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import { deflateSync } from "node:zlib"
import { type PixelBlastField, pixelBlastField } from "../src/lib/design/pixel-blast"

/** The hero tile's side, in pixels: 1020 px at 6 px a cell is 170 cells, so a phone shows a corner of one. */
export const TILE_PIXELS = 1020

/** One square's side, in pixels: 6 px reads as a square at 1:1 without becoming a checkerboard. */
export const CELL_PIXELS = 6

/** The share of the tile the field inks. */
const INK = 0.28

/** The seed that shapes the field: the same seed prints the same picture on every build. */
const SEED = 7

/** The bytes a PNG opens with, before its first chunk. */
const SIGNATURE = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])

/** The CRC table the PNG's chunk checksums are folded from. */
const CRC = (() => {
	const table = new Uint32Array(256)
	for (let entry = 0; entry < 256; entry += 1) {
		let value = entry
		for (let bit = 0; bit < 8; bit += 1) {
			value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1
		}
		table[entry] = value >>> 0
	}
	return table
})()

/** The CRC-32 a PNG chunk carries over its type and its data. */
function crc32(bytes: Uint8Array): number {
	let crc = 0xffffffff
	for (const byte of bytes) crc = (CRC[(crc ^ byte) & 0xff] ?? 0) ^ (crc >>> 8)
	return (crc ^ 0xffffffff) >>> 0
}

/** One PNG chunk: its length, its type, its data and its checksum. */
export function pngChunk(type: string, data: Uint8Array): Uint8Array {
	const chunk = new Uint8Array(12 + data.length)
	const view = new DataView(chunk.buffer)
	view.setUint32(0, data.length)
	for (let index = 0; index < 4; index += 1) chunk[4 + index] = type.charCodeAt(index)
	chunk.set(data, 8)
	view.setUint32(8 + data.length, crc32(chunk.subarray(4, 8 + data.length)))
	return chunk
}

/**
 * The field as a one-bit PNG: a two-entry palette where the first entry is transparent and the
 * second is white, so the image is a mask with no colour in it. Each cell is drawn as a
 * `cellPixels`-square block, and the scanlines deflate into the same few kilobytes on every build.
 */
export function oneBitPng(field: PixelBlastField, cellPixels: number): Uint8Array {
	const width = field.width * cellPixels
	const height = field.height * cellPixels
	const rowBytes = Math.ceil(width / 8)
	const scanlines = new Uint8Array((rowBytes + 1) * height)
	for (let y = 0; y < height; y += 1) {
		const row = y * (rowBytes + 1)
		const cells = Math.floor(y / cellPixels) * field.width
		for (let x = 0; x < width; x += 1) {
			if (field.cells[cells + Math.floor(x / cellPixels)] !== true) continue
			const byte = row + 1 + (x >> 3)
			scanlines[byte] = (scanlines[byte] ?? 0) | (0x80 >> (x & 7))
		}
	}
	const header = new Uint8Array(13)
	const view = new DataView(header.buffer)
	view.setUint32(0, width)
	view.setUint32(4, height)
	header[8] = 1
	header[9] = 3
	const palette = new Uint8Array([255, 255, 255, 255, 255, 255])
	const alpha = new Uint8Array([0, 255])
	const parts = [
		SIGNATURE,
		pngChunk("IHDR", header),
		pngChunk("PLTE", palette),
		pngChunk("tRNS", alpha),
		pngChunk("IDAT", deflateSync(scanlines)),
		pngChunk("IEND", new Uint8Array()),
	]
	const png = new Uint8Array(parts.reduce((total, part) => total + part.length, 0))
	let offset = 0
	for (const part of parts) {
		png.set(part, offset)
		offset += part.length
	}
	return png
}

/** Writes the hero's tile into the Site's static directory, and returns the bytes it wrote. */
export async function writeHeroGround(destination: string): Promise<number> {
	const cells = TILE_PIXELS / CELL_PIXELS
	const field = pixelBlastField({ width: cells, height: cells, ink: INK, seed: SEED })
	const png = oneBitPng(field, CELL_PIXELS)
	await mkdir(destination, { recursive: true })
	const path = join(destination, "pixel-blast.png")
	await writeFile(path, png)
	const written = Bun.file(path)
	if (!(await written.exists()) || written.size !== png.length) {
		throw new Error(`hero-ground: ${path} was not written in full.`)
	}
	return png.length
}

if (import.meta.main) {
	const destination = fileURLToPath(new URL("../public/hero", import.meta.url))
	const bytes = await writeHeroGround(destination)
	console.log(`hero-ground: ${bytes} bytes in ${destination}`)
}
