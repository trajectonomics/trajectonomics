/** wawoff2 ships no types: it decompresses one WOFF2 file to the sfnt it carries. */
declare module "wawoff2" {
	export function decompress(file: Uint8Array | ArrayBuffer): Promise<Uint8Array>
	export function compress(file: Uint8Array | ArrayBuffer): Promise<Uint8Array>
}
