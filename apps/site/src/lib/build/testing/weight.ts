import type { BuiltFile } from "../built-files"

/** A deterministic stream of printable characters, so gzip cannot shrink it much. */
export function incompressible(bytes: number): string {
	let seed = 20261114
	let text = ""
	for (let index = 0; index < bytes; index++) {
		seed = (seed * 1664525 + 1013904223) >>> 0
		text += String.fromCharCode(33 + (seed % 94))
	}
	return text
}

/** One built page, declaring `language`, with the head and body fragments a check needs to see. */
export function page(path: string, head = "", body = "", language = "en"): BuiltFile {
	const content = `<!DOCTYPE html><html lang="${language}" data-theme="light"><head>${head}</head><body>${body}</body></html>`
	return { path, content }
}

/** A built file at `path` whose content is the fixture text. */
export function asset(path: string, content: string): BuiltFile {
	return { path, content }
}
