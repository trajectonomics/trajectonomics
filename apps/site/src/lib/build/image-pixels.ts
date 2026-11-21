/** An image's size in pixels, read from the header its own format states. */
export interface ImagePixels {
	readonly width: number
	readonly height: number
}

/** The eight bytes every PNG opens with. */
const PNG_SIGNATURE = Object.freeze([137, 80, 78, 71, 13, 10, 26, 10])

/** The bytes a PNG header occupies: the signature, the chunk length, `IHDR`, the width and the height. */
export const PNG_HEADER_BYTES = 24
const TYPE_OFFSET = 12
const WIDTH_OFFSET = 16
const HEIGHT_OFFSET = 20

/** Whether `bytes` opens like a PNG: its signature, then the `IHDR` chunk every PNG writes first. */
function isPngHeader(bytes: Uint8Array): boolean {
	if (bytes.length < PNG_HEADER_BYTES) return false
	if (!PNG_SIGNATURE.every((byte, index) => bytes[index] === byte)) return false
	return String.fromCharCode(...bytes.subarray(TYPE_OFFSET, TYPE_OFFSET + 4)) === "IHDR"
}

/** The size a PNG states in its header, or `undefined` when the bytes are not one. */
export function pngPixels(bytes: Uint8Array): ImagePixels | undefined {
	if (!isPngHeader(bytes)) return undefined
	const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
	const width = view.getUint32(WIDTH_OFFSET)
	const height = view.getUint32(HEIGHT_OFFSET)
	return width === 0 || height === 0 ? undefined : Object.freeze({ width, height })
}
